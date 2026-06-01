#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-public-send-preflight-decision-packet-2026-06-01';
const DEFAULT_REPORTS_DIR = '/Users/alejandrogomez/Documents/Mantis-Reports';
const DEFAULT_ASSET_MANIFEST = `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_asset_manifest_current_inteligencia_descansar_2026-05-31.json`;
const DEFAULT_SHOPIFY_PUBLIC_URL_GATE = `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_shopify_public_url_gate_current_inteligencia_descansar_2026-05-31.json`;
const DEFAULT_SHOPIFY_PREVIEW_ROUTE_EXECUTION_RECEIPT = `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_shopify_preview_route_execution_receipt_current_inteligencia_descansar_2026-05-31.json`;
const DEFAULT_PUBLIC_AUDIENCE_SCOPE_PACKET = `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_public_audience_scope_packet_current_inteligencia_descansar_2026-05-31.json`;
const DEFAULT_PUBLIC_AUDIENCE_SUPPRESSION_POLICY_PACKET = `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_public_audience_suppression_policy_packet_current_inteligencia_descansar_2026-05-31.json`;
const DEFAULT_PUBLIC_LAUNCH_READINESS_PACKET = `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_public_launch_readiness_packet_current_inteligencia_descansar_2026-05-31.json`;
const DEFAULT_NULL_AUDIENCE_REPLACEMENT_EXECUTION_RECEIPT = `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_null_audience_replacement_execution_receipt_current_inteligencia_descansar_2026-05-31.json`;
const DEFAULT_NULL_AUDIENCE_SEED_INBOX_QA = `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_null_audience_seed_inbox_qa_current_inteligencia_descansar_2026-05-31.json`;
const DEFAULT_OUTPUT = `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_public_send_preflight_decision_packet_current_inteligencia_descansar_2026-05-31.json`;
const DEFAULT_MARKDOWN_OUTPUT = `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_public_send_preflight_decision_packet_current_inteligencia_descansar_2026-05-31.md`;

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-public-send-preflight-decision-packet.mjs [options]

Options:
  --asset-manifest <path>                         Current mini-launch asset manifest JSON. Defaults to ${DEFAULT_ASSET_MANIFEST}
  --shopify-public-url-gate <path>                Current Shopify public URL gate JSON. Defaults to ${DEFAULT_SHOPIFY_PUBLIC_URL_GATE}
  --shopify-preview-route-execution-receipt <path> Current Shopify preview route execution receipt JSON. Defaults to ${DEFAULT_SHOPIFY_PREVIEW_ROUTE_EXECUTION_RECEIPT}
  --public-audience-scope-packet <path>           Current public audience scope packet JSON. Defaults to ${DEFAULT_PUBLIC_AUDIENCE_SCOPE_PACKET}
  --public-audience-suppression-policy-packet <path> Current suppression/exclusion policy packet JSON. Defaults to ${DEFAULT_PUBLIC_AUDIENCE_SUPPRESSION_POLICY_PACKET}
  --public-launch-readiness-packet <path>         Current public launch readiness packet JSON. Defaults to ${DEFAULT_PUBLIC_LAUNCH_READINESS_PACKET}
  --null-audience-replacement-execution-receipt <path> Current Null Audience replacement receipt JSON. Defaults to ${DEFAULT_NULL_AUDIENCE_REPLACEMENT_EXECUTION_RECEIPT}
  --null-audience-seed-inbox-qa <path>            Current Null Audience seed inbox QA JSON. Defaults to ${DEFAULT_NULL_AUDIENCE_SEED_INBOX_QA}
  --out <path>                                    Write JSON report. Defaults to ${DEFAULT_OUTPUT}
  --markdown-out <path>                           Write Markdown report. Defaults to ${DEFAULT_MARKDOWN_OUTPUT}
  --help                                          Show this help

Local-only public-send preflight decision packet for the Inteligencia para
descansar mini-launch. It explains the combined URL lifecycle + audience-scope
decision before any exact approval phrase. It never calls MailerLite, Shopify
or CRM live APIs, opens UI, reads or mutates subscribers, assigns groups,
publishes, schedules or sends campaigns, appends ledgers, writes cards/scoring,
writes Fact Store, or prints secrets, raw IDs, recipients or exact URLs.`;

const cleanString = (value) => {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed || null;
};

const parseArgs = (argv) => {
  const options = {
    assetManifest: DEFAULT_ASSET_MANIFEST,
    shopifyPublicUrlGate: DEFAULT_SHOPIFY_PUBLIC_URL_GATE,
    shopifyPreviewRouteExecutionReceipt: DEFAULT_SHOPIFY_PREVIEW_ROUTE_EXECUTION_RECEIPT,
    publicAudienceScopePacket: DEFAULT_PUBLIC_AUDIENCE_SCOPE_PACKET,
    publicAudienceSuppressionPolicyPacket: DEFAULT_PUBLIC_AUDIENCE_SUPPRESSION_POLICY_PACKET,
    publicLaunchReadinessPacket: DEFAULT_PUBLIC_LAUNCH_READINESS_PACKET,
    nullAudienceReplacementExecutionReceipt: DEFAULT_NULL_AUDIENCE_REPLACEMENT_EXECUTION_RECEIPT,
    nullAudienceSeedInboxQa: DEFAULT_NULL_AUDIENCE_SEED_INBOX_QA,
    out: DEFAULT_OUTPUT,
    markdownOut: DEFAULT_MARKDOWN_OUTPUT,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--asset-manifest') options.assetManifest = argv[++index];
    else if (arg === '--shopify-public-url-gate') options.shopifyPublicUrlGate = argv[++index];
    else if (arg === '--shopify-preview-route-execution-receipt') options.shopifyPreviewRouteExecutionReceipt = argv[++index];
    else if (arg === '--public-audience-scope-packet') options.publicAudienceScopePacket = argv[++index];
    else if (arg === '--public-audience-suppression-policy-packet') options.publicAudienceSuppressionPolicyPacket = argv[++index];
    else if (arg === '--public-launch-readiness-packet') options.publicLaunchReadinessPacket = argv[++index];
    else if (arg === '--null-audience-replacement-execution-receipt') options.nullAudienceReplacementExecutionReceipt = argv[++index];
    else if (arg === '--null-audience-seed-inbox-qa') options.nullAudienceSeedInboxQa = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  return options;
};

const sha256 = (value) => createHash('sha256').update(String(value)).digest('hex');

const readJsonWithDigest = async (path, consultedFor) => {
  const resolved = resolve(path);
  const raw = await readFile(resolved, 'utf8');
  return {
    value: JSON.parse(raw),
    digest: {
      path: resolved,
      present: true,
      private: false,
      chars: raw.length,
      sha256: sha256(raw),
      consultedFor,
    },
  };
};

const buildSafety = () => ({
  localOnly: true,
  reportsOnly: true,
  uiOpened: false,
  browserOpened: false,
  mailerLiteApiCalled: false,
  mailerLiteUiUsed: false,
  mailerLiteMutationsPerformed: false,
  shopifyApiCalled: false,
  shopifyMutationsPerformed: false,
  shopifyPublishPerformed: false,
  crmLiveApiCalled: false,
  subscribersRead: false,
  subscriberRowsPrinted: false,
  subscriberMutationsPerformed: false,
  groupMutationsPerformed: false,
  workflowMutationsPerformed: false,
  sendsPerformed: false,
  campaignsPublished: false,
  campaignsScheduled: false,
  signalLedgerAppendPerformed: false,
  crmCardMutationsPerformed: false,
  crmScoreMutationsPerformed: false,
  factStoreWritePerformed: false,
  rawIdsPrinted: false,
  exactUrlsPrinted: false,
  recipientsPrinted: false,
  tokensPrinted: false,
});

const closedSafety = (safety) => Object.entries(safety)
  .every(([key, value]) => key === 'localOnly' || key === 'reportsOnly' ? value === true : value === false);

const slotSummariesFromManifest = (assetManifest) => (assetManifest?.finalPublicLinks?.slots ?? [])
  .map((slot) => ({
    key: cleanString(slot?.key),
    stage: cleanString(slot?.linkLifecycle?.currentStage),
    publicUrlReady: slot?.publicUrlReady === true,
    previewUrlReady: Boolean(slot?.linkLifecycle?.previewUrlReady),
    liveUrlReady: slot?.linkLifecycle?.liveUrlReady === true,
    previewPromotedToLive: slot?.linkLifecycle?.previewPromotedToLive === true,
    publicAudienceSendReady: slot?.linkLifecycle?.publicAudienceSendReady === true,
    publicUrlSha256: cleanString(slot?.publicUrlSha256),
    exactPublicUrlStoredInReport: slot?.exactPublicUrlStoredInReport === true,
  }));

const optionById = (scopePacket, id) =>
  (scopePacket?.audienceScopeOptions ?? []).find((option) => option?.id === id) ?? null;

const buildPublicSendPreflightDecisionPacket = ({
  assetManifest,
  shopifyPublicUrlGate,
  shopifyPreviewRouteExecutionReceipt,
  publicAudienceScopePacket,
  publicAudienceSuppressionPolicyPacket,
  publicLaunchReadinessPacket,
  nullAudienceReplacementExecutionReceipt,
  nullAudienceSeedInboxQa,
  sourceDigests = [],
  generatedAt = new Date().toISOString(),
}) => {
  const safety = buildSafety();
  const slotSummaries = slotSummariesFromManifest(assetManifest);
  const selectedScopeOption =
    optionById(publicAudienceScopePacket, 'existing_legacy_onboarding_complete_campaign_audience')
    ?? optionById(publicAudienceScopePacket, 'manual_micro_cohort')
    ?? null;

  const seedInboxQaGreen =
    nullAudienceSeedInboxQa?.status === 'mailerlite_null_audience_seed_inbox_qa_completed_green_no_live_changes'
    && nullAudienceSeedInboxQa?.deliverySummary?.seedInboxQaGreen === true;
  const replacementDraftsSafe =
    nullAudienceReplacementExecutionReceipt?.status === 'mailerlite_null_audience_replacement_execution_completed_no_sends'
    && nullAudienceReplacementExecutionReceipt?.postCreateQa?.replacementDraftCount === 4
    && nullAudienceReplacementExecutionReceipt?.postCreateQa?.nullAudienceSafeCount === 4
    && nullAudienceReplacementExecutionReceipt?.postCreateQa?.contentGreenCount === 4
    && nullAudienceReplacementExecutionReceipt?.preflight?.safetyGroupActiveCount === 0;
  const previewRouteQaGreen =
    shopifyPreviewRouteExecutionReceipt?.status === 'shopify_preview_route_execution_completed_unlisted_noindex_no_live_mailerlite_crm'
    && shopifyPreviewRouteExecutionReceipt?.executionSummary?.previewRouteReady === true
    && shopifyPreviewRouteExecutionReceipt?.executionSummary?.targetLinkCount === 3
    && shopifyPreviewRouteExecutionReceipt?.qa?.automatedHtmlQa?.statusHttp200ForAll === true
    && shopifyPreviewRouteExecutionReceipt?.qa?.automatedHtmlQa?.noindexForAll === true
    && shopifyPreviewRouteExecutionReceipt?.qa?.automatedHtmlQa?.externalFormActionsForAll === 0;
  const urlLifecycleEvidenceReady =
    assetManifest?.executiveSummary?.finalPublicLinksReady === true
    && shopifyPublicUrlGate?.executiveSummary?.finalPublicLinksReady === true
    && shopifyPublicUrlGate?.executiveSummary?.recommendedVisibilityTier === 'unlisted_noindex_preview'
    && shopifyPublicUrlGate?.executiveSummary?.fullyPublicNavigationRequiredNow === false
    && shopifyPublicUrlGate?.executiveSummary?.seoIndexingAllowedNow === false
    && slotSummaries.length === 3
    && slotSummaries.every((slot) => slot.publicUrlReady && slot.previewUrlReady && !slot.exactPublicUrlStoredInReport);
  const audienceDecisionEvidenceReady =
    publicAudienceScopePacket?.executiveSummary?.freshAudienceScanReady === true
    && publicAudienceScopePacket?.executiveSummary?.suppressionStatusScanReady === true
    && publicAudienceScopePacket?.executiveSummary?.suppressionExclusionPolicyReady === true
    && selectedScopeOption != null
    && Number.isFinite(selectedScopeOption?.knownActiveCount)
    && selectedScopeOption.knownActiveCount > 0;
  const suppressionPolicyReady =
    publicAudienceSuppressionPolicyPacket?.executiveSummary?.suppressionExclusionPolicyReady === true
    && publicAudienceSuppressionPolicyPacket?.safety?.mailerLiteApiCalled === false
    && publicAudienceSuppressionPolicyPacket?.safety?.subscribersRead === false;
  const readinessPacketAligned =
    publicLaunchReadinessPacket?.executiveSummary?.seedInboxQaGreen === true
    && publicLaunchReadinessPacket?.executiveSummary?.nullAudienceReplacementDraftsReady === true
    && publicLaunchReadinessPacket?.executiveSummary?.previewLinksReady === true
    && publicLaunchReadinessPacket?.executiveSummary?.blockerCount === 3
    && publicLaunchReadinessPacket?.executiveSummary?.liveActionAllowedNow === false;

  const blockersBeforeHumanExplanation = [
    seedInboxQaGreen ? null : 'seed_inbox_qa_not_green',
    replacementDraftsSafe ? null : 'null_audience_replacement_drafts_not_safe',
    previewRouteQaGreen ? null : 'shopify_preview_route_qa_not_green',
    urlLifecycleEvidenceReady ? null : 'url_lifecycle_evidence_not_ready',
    audienceDecisionEvidenceReady ? null : 'audience_decision_evidence_not_ready',
    suppressionPolicyReady ? null : 'suppression_policy_not_ready',
    readinessPacketAligned ? null : 'public_launch_readiness_packet_not_aligned',
  ].filter(Boolean);
  const decisionExplanationReady = blockersBeforeHumanExplanation.length === 0;

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_mini_launch_public_send_preflight_decision_packet',
    generatedAt,
    ok: true,
    status: decisionExplanationReady
      ? 'public_send_preflight_decision_packet_ready_for_human_explanation_no_live_changes'
      : 'public_send_preflight_decision_packet_blocked_missing_evidence_no_live_changes',
    launch: assetManifest?.launch ?? publicLaunchReadinessPacket?.launch ?? {
      launchId: 'mini_2026_06_rehearsal_inteligencia_para_descansar',
      resourceName: 'Inteligencia para descansar',
      resourceType: 'quiz',
    },
    executiveSummary: {
      decisionExplanationReady,
      exactApprovalPhraseAvailable: false,
      exactApprovalPhrasePrinted: false,
      canAskExactApprovalNow: false,
      canExecuteNow: false,
      liveActionAllowedNow: false,
      seedInboxQaGreen,
      replacementDraftsSafe,
      previewRouteQaGreen,
      urlLifecycleEvidenceReady,
      audienceDecisionEvidenceReady,
      suppressionPolicyReady,
      recommendedUrlDecisionId: 'promote_existing_unlisted_noindex_preview_links_to_audience_send_ready',
      recommendedAudienceScopeId: selectedScopeOption?.id ?? null,
      recommendedAudienceKnownActiveCount: selectedScopeOption?.knownActiveCount ?? null,
      blockerCount: blockersBeforeHumanExplanation.length,
      nextSafeAction: decisionExplanationReady
        ? 'Explain the URL + audience preflight decision to Alejandro before generating any exact approval phrase.'
        : 'Resolve missing local evidence before explaining or requesting any public-send approval boundary.',
    },
    recommendedDecision: {
      urlLifecycle: {
        id: 'promote_existing_unlisted_noindex_preview_links_to_audience_send_ready',
        meaning: 'Use the existing unlisted/noindex preview URLs as the audience-send URL slots for this test launch, without adding navigation or SEO indexing.',
        why: 'The same-slot lifecycle avoids creating separate preview/live URL sets, and the current links already pass real-browser QA for exact-link access.',
        requiresShopifyMutationNow: false,
        requiresNavigationChangeNow: false,
        requiresSeoIndexingNow: false,
        stillRequiresExactApprovalBeforeUse: true,
        slotCount: slotSummaries.length,
        slots: slotSummaries,
      },
      audienceScope: {
        id: selectedScopeOption?.id ?? null,
        label: selectedScopeOption?.label ?? null,
        groupName: selectedScopeOption?.groupName ?? null,
        knownActiveCount: selectedScopeOption?.knownActiveCount ?? null,
        why: 'This uses an already observed practical campaign audience, avoids creating a new group, and keeps suppression/exclusion policy active.',
        alternatives: [
          'manual_micro_cohort',
          'keep_null_audience_no_public_send',
          'future_general_newsletter_eligible_after_onboarding_v2',
        ],
        stillRequiresExactApprovalBeforeAssignmentOrSend: true,
      },
    },
    futureApprovalBoundary: {
      boundaryId: 'mini_launch_public_send_preflight_decision',
      phraseGeneratedByThisPacket: false,
      canGeneratePhraseAfterExplanation: decisionExplanationReady,
      proposedApprovalWouldOnlyAllow: [
        'mark the current URL slots as audience-send-ready in local evidence if Alejandro accepts the unlisted/noindex route for this test launch',
        'record the selected audience-scope decision locally',
        'prepare the final public-send approval packet after a fresh re-scan',
      ],
      stillClosedEvenAfterDecisionApproval: [
        'MailerLite draft audience assignment',
        'public_or_audience_send',
        'workflow_or_automation_changes',
        'subscriber_import_update_or_suppression_mutation',
        'Shopify navigation or SEO publication',
        'CRM live writes',
        'Signal Ledger append',
        'card or scoring writes',
        'Fact Store writes',
      ],
      requiredFreshEvidenceBeforeAnyFinalSend: [
        'fresh MailerLite audience scan',
        'fresh Null Audience/draft QA',
        'fresh URL gate receipt with audience-send-ready slots',
        'exact public-send approval phrase after the decision gate',
      ],
    },
    blockersBeforeHumanExplanation,
    hardStops: [
      'No approval phrase is generated by this packet.',
      'No MailerLite audience assignment, public send, publish or schedule.',
      'No subscriber, group, segment, suppression, workflow or automation mutation.',
      'No Shopify navigation, SEO or theme publish change.',
      'No CRM live API write, Signal Ledger append, card/scoring write or Fact Store write.',
      'Do not print exact URLs, recipients, raw IDs or tokens.',
    ],
    sourceDigests,
    safety,
  };
};

const loadPacketFromFiles = async (options) => {
  const sources = await Promise.all([
    readJsonWithDigest(options.assetManifest, 'current final-link slot lifecycle and redacted URL hashes'),
    readJsonWithDigest(options.shopifyPublicUrlGate, 'current public URL gate and visibility posture'),
    readJsonWithDigest(options.shopifyPreviewRouteExecutionReceipt, 'real-browser QA for the existing preview route'),
    readJsonWithDigest(options.publicAudienceScopePacket, 'audience-scope options and aggregate audience evidence'),
    readJsonWithDigest(options.publicAudienceSuppressionPolicyPacket, 'suppression/exclusion local policy'),
    readJsonWithDigest(options.publicLaunchReadinessPacket, 'current public launch readiness blockers'),
    readJsonWithDigest(options.nullAudienceReplacementExecutionReceipt, 'current replacement draft Null Audience safety'),
    readJsonWithDigest(options.nullAudienceSeedInboxQa, 'seed inbox QA status'),
  ]);

  return buildPublicSendPreflightDecisionPacket({
    assetManifest: sources[0].value,
    shopifyPublicUrlGate: sources[1].value,
    shopifyPreviewRouteExecutionReceipt: sources[2].value,
    publicAudienceScopePacket: sources[3].value,
    publicAudienceSuppressionPolicyPacket: sources[4].value,
    publicLaunchReadinessPacket: sources[5].value,
    nullAudienceReplacementExecutionReceipt: sources[6].value,
    nullAudienceSeedInboxQa: sources[7].value,
    sourceDigests: sources.map((source) => source.digest),
  });
};

const renderList = (items = []) => items.length ? items.map((item) => `- ${item}`).join('\n') : '- none';

const renderMarkdown = (report) => [
  '# MailerLite Mini-Launch Public Send Preflight Decision Packet',
  '',
  `Generated: ${report.generatedAt}`,
  `Status: ${report.status}`,
  `Launch: ${report.launch?.resourceName ?? 'Inteligencia para descansar'}`,
  '',
  '## Executive Summary',
  '',
  `- Decision explanation ready: ${report.executiveSummary.decisionExplanationReady}`,
  `- Exact approval phrase available: ${report.executiveSummary.exactApprovalPhraseAvailable}`,
  `- Exact approval phrase printed: ${report.executiveSummary.exactApprovalPhrasePrinted}`,
  `- Can ask exact approval now: ${report.executiveSummary.canAskExactApprovalNow}`,
  `- Can execute now: ${report.executiveSummary.canExecuteNow}`,
  `- Live action allowed now: ${report.executiveSummary.liveActionAllowedNow}`,
  `- URL lifecycle evidence ready: ${report.executiveSummary.urlLifecycleEvidenceReady}`,
  `- Audience decision evidence ready: ${report.executiveSummary.audienceDecisionEvidenceReady}`,
  `- Suppression policy ready: ${report.executiveSummary.suppressionPolicyReady}`,
  `- Recommended URL decision: ${report.executiveSummary.recommendedUrlDecisionId}`,
  `- Recommended audience scope: ${report.executiveSummary.recommendedAudienceScopeId}`,
  `- Recommended audience known active count: ${report.executiveSummary.recommendedAudienceKnownActiveCount}`,
  `- Blocker count: ${report.executiveSummary.blockerCount}`,
  `- Next safe action: ${report.executiveSummary.nextSafeAction}`,
  '',
  '## Recommended Decision',
  '',
  `- URL lifecycle: ${report.recommendedDecision.urlLifecycle.id}`,
  `- URL meaning: ${report.recommendedDecision.urlLifecycle.meaning}`,
  `- URL why: ${report.recommendedDecision.urlLifecycle.why}`,
  `- Audience scope: ${report.recommendedDecision.audienceScope.id}`,
  `- Audience group: ${report.recommendedDecision.audienceScope.groupName}`,
  `- Audience why: ${report.recommendedDecision.audienceScope.why}`,
  '',
  '## Future Approval Boundary',
  '',
  `- Boundary: ${report.futureApprovalBoundary.boundaryId}`,
  `- Phrase generated by this packet: ${report.futureApprovalBoundary.phraseGeneratedByThisPacket}`,
  `- Can generate phrase after explanation: ${report.futureApprovalBoundary.canGeneratePhraseAfterExplanation}`,
  'Proposed approval would only allow:',
  renderList(report.futureApprovalBoundary.proposedApprovalWouldOnlyAllow),
  'Still closed even after decision approval:',
  renderList(report.futureApprovalBoundary.stillClosedEvenAfterDecisionApproval),
  'Required fresh evidence before any final send:',
  renderList(report.futureApprovalBoundary.requiredFreshEvidenceBeforeAnyFinalSend),
  '',
  '## Blockers Before Human Explanation',
  '',
  renderList(report.blockersBeforeHumanExplanation),
  '',
  '## Hard Stops',
  '',
  renderList(report.hardStops),
  '',
  '## Safety',
  '',
  `- Local only: ${report.safety.localOnly}`,
  `- Reports only: ${report.safety.reportsOnly}`,
  `- MailerLite API called: ${report.safety.mailerLiteApiCalled}`,
  `- Shopify API called: ${report.safety.shopifyApiCalled}`,
  `- CRM live API called: ${report.safety.crmLiveApiCalled}`,
  `- Subscribers read: ${report.safety.subscribersRead}`,
  `- Sends performed: ${report.safety.sendsPerformed}`,
  `- Exact URLs printed: ${report.safety.exactUrlsPrinted}`,
  `- Recipients printed: ${report.safety.recipientsPrinted}`,
  `- Tokens printed: ${report.safety.tokensPrinted}`,
  '',
].join('\n');

const writeText = async (path, content) => {
  const resolved = resolve(path);
  await mkdir(dirname(resolved), { recursive: true });
  await writeFile(resolved, content, 'utf8');
  return resolved;
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const report = await loadPacketFromFiles(options);
  if (!closedSafety(report.safety)) throw new Error('safety_not_closed');

  if (options.out) await writeText(options.out, `${JSON.stringify(report, null, 2)}\n`);
  if (options.markdownOut) await writeText(options.markdownOut, `${renderMarkdown(report)}\n`);

  console.log(JSON.stringify({
    ok: report.ok,
    status: report.status,
    generatedAt: report.generatedAt,
    decisionExplanationReady: report.executiveSummary.decisionExplanationReady,
    exactApprovalPhraseAvailable: report.executiveSummary.exactApprovalPhraseAvailable,
    canAskExactApprovalNow: report.executiveSummary.canAskExactApprovalNow,
    canExecuteNow: report.executiveSummary.canExecuteNow,
    urlLifecycleEvidenceReady: report.executiveSummary.urlLifecycleEvidenceReady,
    audienceDecisionEvidenceReady: report.executiveSummary.audienceDecisionEvidenceReady,
    recommendedUrlDecisionId: report.executiveSummary.recommendedUrlDecisionId,
    recommendedAudienceScopeId: report.executiveSummary.recommendedAudienceScopeId,
    recommendedAudienceKnownActiveCount: report.executiveSummary.recommendedAudienceKnownActiveCount,
    blockerCount: report.executiveSummary.blockerCount,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: report.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite mini-launch public send preflight decision packet failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildPublicSendPreflightDecisionPacket,
  buildSafety,
  parseArgs,
  renderMarkdown,
};
