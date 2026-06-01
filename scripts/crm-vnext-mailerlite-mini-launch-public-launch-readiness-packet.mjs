#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-public-launch-readiness-packet-2026-06-01';
const DEFAULT_REPORTS_DIR = '/Users/alejandrogomez/Documents/Mantis-Reports';
const DEFAULT_ASSET_MANIFEST = `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_asset_manifest_current_inteligencia_descansar_2026-05-31.json`;
const DEFAULT_SHOPIFY_PUBLIC_URL_GATE = `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_shopify_public_url_gate_current_inteligencia_descansar_2026-05-31.json`;
const DEFAULT_SHOPIFY_PREVIEW_ROUTE_EXECUTION_RECEIPT = `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_shopify_preview_route_execution_receipt_current_inteligencia_descansar_2026-05-31.json`;
const DEFAULT_PUBLIC_AUDIENCE_SCOPE_PACKET = `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_public_audience_scope_packet_current_inteligencia_descansar_2026-05-31.json`;
const DEFAULT_NULL_AUDIENCE_REPLACEMENT_EXECUTION_RECEIPT = `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_null_audience_replacement_execution_receipt_current_inteligencia_descansar_2026-05-31.json`;
const DEFAULT_NULL_AUDIENCE_SEED_INBOX_QA = `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_null_audience_seed_inbox_qa_current_inteligencia_descansar_2026-05-31.json`;
const DEFAULT_CRM_WRITE_APPROVAL_PACKET = `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_crm_write_approval_packet_current_inteligencia_descansar_2026-05-31.json`;
const DEFAULT_APPROVAL_QUEUE = `${DEFAULT_REPORTS_DIR}/mailerlite_launch_os_approval_queue_current_2026-05-31.json`;
const DEFAULT_OUTPUT = `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_public_launch_readiness_packet_current_inteligencia_descansar_2026-05-31.json`;
const DEFAULT_MARKDOWN_OUTPUT = `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_public_launch_readiness_packet_current_inteligencia_descansar_2026-05-31.md`;

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-public-launch-readiness-packet.mjs [options]

Options:
  --asset-manifest <path>                         Current mini-launch asset manifest JSON. Defaults to ${DEFAULT_ASSET_MANIFEST}
  --shopify-public-url-gate <path>                Current Shopify public URL gate JSON. Defaults to ${DEFAULT_SHOPIFY_PUBLIC_URL_GATE}
  --shopify-preview-route-execution-receipt <path> Current Shopify preview route execution receipt JSON. Defaults to ${DEFAULT_SHOPIFY_PREVIEW_ROUTE_EXECUTION_RECEIPT}
  --public-audience-scope-packet <path>           Current public audience scope packet JSON. Defaults to ${DEFAULT_PUBLIC_AUDIENCE_SCOPE_PACKET}
  --null-audience-replacement-execution-receipt <path> Current MailerLite Null Audience replacement receipt JSON. Defaults to ${DEFAULT_NULL_AUDIENCE_REPLACEMENT_EXECUTION_RECEIPT}
  --null-audience-seed-inbox-qa <path>            Current Null Audience seed inbox QA JSON. Defaults to ${DEFAULT_NULL_AUDIENCE_SEED_INBOX_QA}
  --crm-write-approval-packet <path>              Current CRM write approval packet JSON. Defaults to ${DEFAULT_CRM_WRITE_APPROVAL_PACKET}
  --approval-queue <path>                         Current Launch OS approval queue JSON. Defaults to ${DEFAULT_APPROVAL_QUEUE}
  --out <path>                                    Write JSON report. Defaults to ${DEFAULT_OUTPUT}
  --markdown-out <path>                           Write Markdown report. Defaults to ${DEFAULT_MARKDOWN_OUTPUT}
  --help                                          Show this help

Local-only public launch readiness packet for Inteligencia para descansar. It
converts green seed QA into explicit launch-readiness evidence and blockers.
It does not call MailerLite, Shopify or CRM live APIs, open UI, send emails,
publish or schedule campaigns, read or mutate subscribers, create or assign
groups, edit workflows, append ledgers, write cards/scoring, write Fact Store,
or print secrets, raw IDs, recipients or exact URLs.`;

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
    nullAudienceReplacementExecutionReceipt: DEFAULT_NULL_AUDIENCE_REPLACEMENT_EXECUTION_RECEIPT,
    nullAudienceSeedInboxQa: DEFAULT_NULL_AUDIENCE_SEED_INBOX_QA,
    crmWriteApprovalPacket: DEFAULT_CRM_WRITE_APPROVAL_PACKET,
    approvalQueue: DEFAULT_APPROVAL_QUEUE,
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
    else if (arg === '--null-audience-replacement-execution-receipt') options.nullAudienceReplacementExecutionReceipt = argv[++index];
    else if (arg === '--null-audience-seed-inbox-qa') options.nullAudienceSeedInboxQa = argv[++index];
    else if (arg === '--crm-write-approval-packet') options.crmWriteApprovalPacket = argv[++index];
    else if (arg === '--approval-queue') options.approvalQueue = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  return options;
};

const sha256 = (value) => createHash('sha256').update(String(value)).digest('hex');
const resolvedPath = (value) => cleanString(value) ? resolve(cleanString(value)) : null;
const pathsMatch = (left, right) => Boolean(resolvedPath(left) && resolvedPath(right) && resolvedPath(left) === resolvedPath(right));
const sourceDigestPathFor = (sourceDigests = [], needle) =>
  sourceDigests.find((digest) => cleanString(digest?.consultedFor)?.includes(needle))?.path ?? null;

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

const buildGate = ({ id, label, ready, evidence, blockers = [], nextSafeAction }) => ({
  id,
  label,
  phase: 'pre_send',
  blocksExactPublicSendApprovalReadiness: true,
  status: ready ? 'ready' : 'blocked',
  ready,
  evidence,
  blockers,
  nextSafeAction,
});

const withGateMeta = (gate, meta = {}) => ({
  ...gate,
  ...meta,
});

const buildPublicLaunchReadinessPacket = ({
  assetManifest,
  shopifyPublicUrlGate,
  shopifyPreviewRouteExecutionReceipt,
  publicAudienceScopePacket,
  nullAudienceReplacementExecutionReceipt,
  nullAudienceSeedInboxQa,
  crmWriteApprovalPacket,
  approvalQueue,
  sourceDigests = [],
  generatedAt = new Date().toISOString(),
}) => {
  const safety = buildSafety();
  const currentReplacementReceiptPath = sourceDigestPathFor(
    sourceDigests,
    'Null Audience replacement draft safety',
  );
  const seedInboxQaAppliesToCurrentReplacementReceipt = currentReplacementReceiptPath
    ? pathsMatch(nullAudienceSeedInboxQa?.sourceEvidence?.replacementDraftReceipt, currentReplacementReceiptPath)
    : true;

  const rawSeedInboxQaGreen =
    nullAudienceSeedInboxQa?.status === 'mailerlite_null_audience_seed_inbox_qa_completed_green_no_live_changes'
    && nullAudienceSeedInboxQa?.deliverySummary?.seedInboxQaGreen === true
    && nullAudienceSeedInboxQa?.deliverySummary?.deliveredToApprovedSeed === nullAudienceSeedInboxQa?.deliverySummary?.expectedSeedMessages
    && nullAudienceSeedInboxQa?.deliverySummary?.newCorrectedMessagesFoundOutsideApprovedSeed === 0
    && nullAudienceSeedInboxQa?.safety?.gmailReadOnly === true
    && nullAudienceSeedInboxQa?.safety?.mailerLiteSendsPerformedByThisQa === false;
  const seedInboxQaGreen = rawSeedInboxQaGreen && seedInboxQaAppliesToCurrentReplacementReceipt;

  const nullAudienceDraftsReady =
    nullAudienceReplacementExecutionReceipt?.status === 'mailerlite_null_audience_replacement_execution_completed_no_sends'
    && nullAudienceReplacementExecutionReceipt?.postCreateQa?.replacementDraftCount === 4
    && nullAudienceReplacementExecutionReceipt?.postCreateQa?.nullAudienceSafeCount === 4
    && nullAudienceReplacementExecutionReceipt?.postCreateQa?.contentGreenCount === 4
    && nullAudienceReplacementExecutionReceipt?.preflight?.safetyGroupActiveCount === 0
    && nullAudienceReplacementExecutionReceipt?.safety?.sendsPerformed === false
    && nullAudienceReplacementExecutionReceipt?.safety?.campaignsPublished === false
    && nullAudienceReplacementExecutionReceipt?.safety?.campaignsScheduled === false
    && nullAudienceReplacementExecutionReceipt?.safety?.nonNullAudienceGroupsAssigned === false
    && nullAudienceReplacementExecutionReceipt?.safety?.tokensPrinted === false;

  const previewRouteReady =
    shopifyPreviewRouteExecutionReceipt?.status === 'shopify_preview_route_execution_completed_unlisted_noindex_no_live_mailerlite_crm'
    && shopifyPreviewRouteExecutionReceipt?.executionSummary?.previewRouteReady === true
    && shopifyPreviewRouteExecutionReceipt?.executionSummary?.targetLinkCount === 3
    && shopifyPreviewRouteExecutionReceipt?.executionSummary?.canUseForLocalCorrectionPreview === true
    && shopifyPreviewRouteExecutionReceipt?.qa?.automatedHtmlQa?.statusHttp200ForAll === true
    && shopifyPreviewRouteExecutionReceipt?.qa?.automatedHtmlQa?.noindexForAll === true
    && shopifyPreviewRouteExecutionReceipt?.qa?.automatedHtmlQa?.externalFormActionsForAll === 0;

  const finalPublicLinksReady = assetManifest?.executiveSummary?.finalPublicLinksReady === true
    && shopifyPublicUrlGate?.executiveSummary?.finalPublicLinksReady === true;
  const publicAudienceSendUrlGateReady = assetManifest?.executiveSummary?.publicAudienceSendUrlGateReady === true
    && shopifyPublicUrlGate?.executiveSummary?.publicAudienceSendUrlGateReady === true
    && shopifyPreviewRouteExecutionReceipt?.executionSummary?.publicAudienceSendUrlGateReady === true;
  const publicAudienceScopeReady = publicAudienceScopePacket?.executiveSummary?.publicAudienceScopeReady === true;
  const publicAudienceScopePreSendBlockers = (
    publicAudienceScopePacket?.blockersBeforeScopeReady ?? ['public_audience_scope_not_defined']
  ).filter((blocker) => blocker !== 'current_drafts_point_only_to_empty_safety_group');
  const explicitAudienceAssignmentExecutionBlockers =
    publicAudienceScopePacket?.audienceAssignmentExecutionBlockers;
  const legacyAudienceAssignmentExecutionBlockers = (publicAudienceScopePacket?.blockersBeforeScopeReady ?? [])
    .filter((blocker) => blocker === 'current_drafts_point_only_to_empty_safety_group');
  const currentDraftAudience =
    publicAudienceScopePacket?.executiveSummary?.currentDraftAudience ?? 'null_audience_safety_group_only';
  const normalizedAudienceAssignmentExecutionBlockers = Array.isArray(explicitAudienceAssignmentExecutionBlockers)
    ? explicitAudienceAssignmentExecutionBlockers
    : legacyAudienceAssignmentExecutionBlockers.length
      ? legacyAudienceAssignmentExecutionBlockers
      : currentDraftAudience === 'null_audience_safety_group_only'
        ? ['current_drafts_point_only_to_empty_safety_group']
        : [];
  const audienceAssignmentExecutionReady = normalizedAudienceAssignmentExecutionBlockers.length === 0;
  const crmObservedEventsReady =
    crmWriteApprovalPacket?.executiveSummary?.approvalRequestReady === true
    && crmWriteApprovalPacket?.executiveSummary?.exactEventCountReady > 0
    && crmWriteApprovalPacket?.executiveSummary?.exactPersonCountReady > 0;
  const exactPublicSendApprovalAlreadyQueued = (approvalQueue?.executiveSummary?.readyApprovalIds ?? [])
    .includes('mini_launch_public_or_audience_send');

  const gates = [
    buildGate({
      id: 'seed_inbox_qa',
      label: '4/4 Null Audience test emails delivered to approved seed and passed inbox QA',
      ready: seedInboxQaGreen,
      evidence: {
        status: nullAudienceSeedInboxQa?.status ?? null,
        deliveredToApprovedSeed: nullAudienceSeedInboxQa?.deliverySummary?.deliveredToApprovedSeed ?? null,
        expectedSeedMessages: nullAudienceSeedInboxQa?.deliverySummary?.expectedSeedMessages ?? null,
        correctedOutsideSeedCount:
          nullAudienceSeedInboxQa?.deliverySummary?.newCorrectedMessagesFoundOutsideApprovedSeed ?? null,
        rawSeedInboxQaGreen,
        appliesToCurrentReplacementReceipt: seedInboxQaAppliesToCurrentReplacementReceipt,
      },
      blockers: seedInboxQaGreen
        ? []
        : [
          rawSeedInboxQaGreen && !seedInboxQaAppliesToCurrentReplacementReceipt
            ? 'seed_inbox_qa_stale_for_current_replacement_drafts'
            : 'seed_inbox_qa_not_green',
        ],
      nextSafeAction: seedInboxQaGreen
        ? 'Use as test-only evidence; do not treat as audience-send authorization.'
        : 'Repair seed inbox QA before considering any public launch boundary.',
    }),
    buildGate({
      id: 'replacement_drafts',
      label: 'MailerLite replacement drafts are content-green and assigned only to the empty safety audience',
      ready: nullAudienceDraftsReady,
      evidence: {
        status: nullAudienceReplacementExecutionReceipt?.status ?? null,
        replacementDraftCount: nullAudienceReplacementExecutionReceipt?.postCreateQa?.replacementDraftCount ?? null,
        nullAudienceSafeCount: nullAudienceReplacementExecutionReceipt?.postCreateQa?.nullAudienceSafeCount ?? null,
        contentGreenCount: nullAudienceReplacementExecutionReceipt?.postCreateQa?.contentGreenCount ?? null,
        safetyGroupActiveCount: nullAudienceReplacementExecutionReceipt?.preflight?.safetyGroupActiveCount ?? null,
      },
      blockers: nullAudienceDraftsReady ? [] : ['null_audience_replacement_drafts_not_green'],
      nextSafeAction: nullAudienceDraftsReady
        ? 'Keep these drafts as inert QA artifacts until a separate audience scope exists.'
        : 'Regenerate/inspect replacement draft evidence before any future test or launch decision.',
    }),
    buildGate({
      id: 'preview_links',
      label: 'Shopify preview route is available for exact-link QA only',
      ready: previewRouteReady,
      evidence: {
        status: shopifyPreviewRouteExecutionReceipt?.status ?? null,
        targetLinkCount: shopifyPreviewRouteExecutionReceipt?.executionSummary?.targetLinkCount ?? null,
        canUseForLocalCorrectionPreview:
          shopifyPreviewRouteExecutionReceipt?.executionSummary?.canUseForLocalCorrectionPreview ?? null,
        canUseForPublicAudienceSend:
          shopifyPreviewRouteExecutionReceipt?.executionSummary?.canUseForPublicAudienceSend ?? null,
        publicAudienceSendUrlGateReady:
          shopifyPreviewRouteExecutionReceipt?.executionSummary?.publicAudienceSendUrlGateReady ?? null,
      },
      blockers: previewRouteReady ? [] : ['shopify_preview_route_not_ready_for_qa'],
      nextSafeAction: previewRouteReady
        ? 'Use preview links for QA/review only; keep audience send blocked until live/promoted link gate is green.'
        : 'Refresh Web/Shopify preview-route evidence before link QA.',
    }),
    buildGate({
      id: 'public_audience_url_gate',
      label: 'URLs are suitable for public/audience sending',
      ready: publicAudienceSendUrlGateReady,
      evidence: {
        finalPublicLinksReady,
        assetManifestPublicAudienceSendUrlGateReady:
          assetManifest?.executiveSummary?.publicAudienceSendUrlGateReady ?? null,
        shopifyPublicUrlGateReady:
          shopifyPublicUrlGate?.executiveSummary?.publicAudienceSendUrlGateReady ?? null,
        previewRouteExecutionPublicAudienceSendUrlGateReady:
          shopifyPreviewRouteExecutionReceipt?.executionSummary?.publicAudienceSendUrlGateReady ?? null,
        liveUrlReadyCount: assetManifest?.executiveSummary?.liveUrlReadyCount ?? null,
        previewPromotedToLiveCount: assetManifest?.executiveSummary?.previewPromotedToLiveCount ?? null,
      },
      blockers: publicAudienceSendUrlGateReady
        ? []
        : ['public_audience_url_gate_not_ready', 'preview_unlisted_noindex_links_are_not_audience_send_links'],
      nextSafeAction: 'Promote or approve the URL lifecycle separately before any public/audience send request.',
    }),
    buildGate({
      id: 'public_audience_scope',
      label: 'Public/audience recipient scope is explicitly defined',
      ready: publicAudienceScopeReady,
      evidence: {
        status: publicAudienceScopePacket?.status ?? null,
        audienceScopePacketReady: publicAudienceScopePacket?.executiveSummary?.audienceScopePacketReady ?? null,
        currentDraftAudience: 'null_audience_safety_group_only',
        safetyGroupActiveCount: nullAudienceReplacementExecutionReceipt?.preflight?.safetyGroupActiveCount ?? null,
        selectedAudienceScopeId: publicAudienceScopePacket?.executiveSummary?.selectedAudienceScopeId ?? null,
        recommendedDefaultNow: publicAudienceScopePacket?.executiveSummary?.recommendedDefaultNow ?? null,
        recommendedFutureDecisionPath: publicAudienceScopePacket?.executiveSummary?.recommendedFutureDecisionPath ?? null,
        candidateOptionCount: publicAudienceScopePacket?.executiveSummary?.candidateOptionCount ?? null,
        approvalQueueReadyIds: approvalQueue?.executiveSummary?.readyApprovalIds ?? [],
      },
      blockers: publicAudienceScopeReady
        ? []
        : publicAudienceScopePreSendBlockers,
      nextSafeAction: 'Define audience scope in a separate packet; do not infer it from seed QA or Null Audience drafts.',
    }),
    withGateMeta(buildGate({
      id: 'audience_assignment_execution',
      label: 'Replacement drafts have not been reassigned from the empty safety audience',
      ready: audienceAssignmentExecutionReady,
      evidence: {
        currentDraftAudience,
        currentSafetyGroupName: publicAudienceScopePacket?.executiveSummary?.currentSafetyGroupName ?? null,
        currentSafetyGroupActiveCount:
          publicAudienceScopePacket?.executiveSummary?.currentSafetyGroupActiveCount ?? null,
        selectedAudienceScopeId: publicAudienceScopePacket?.executiveSummary?.selectedAudienceScopeId ?? null,
        currentDraftsRemainInertUntilExactApproval:
          publicAudienceScopePacket?.executiveSummary?.currentDraftsRemainInertUntilExactApproval ?? null,
      },
      blockers: normalizedAudienceAssignmentExecutionBlockers,
      nextSafeAction: 'Keep replacement drafts inert until an exact execution approval allows assignment to the selected audience.',
    }), {
      phase: 'approval_execution',
      blocksExactPublicSendApprovalReadiness: false,
    }),
    withGateMeta(buildGate({
      id: 'crm_observed_events',
      label: 'Real observed events and exact people exist for CRM/Fact Store writes',
      ready: crmObservedEventsReady,
      evidence: {
        status: crmWriteApprovalPacket?.status ?? null,
        exactEventCountReady: crmWriteApprovalPacket?.executiveSummary?.exactEventCountReady ?? null,
        exactPersonCountReady: crmWriteApprovalPacket?.executiveSummary?.exactPersonCountReady ?? null,
        operationsExecuted: crmWriteApprovalPacket?.executiveSummary?.operationsExecuted ?? null,
      },
      blockers: crmObservedEventsReady
        ? []
        : (crmWriteApprovalPacket?.executiveSummary?.blockers ?? ['crm_real_observed_events_missing']),
      nextSafeAction: 'Keep CRM writes blocked until real post-launch observations exist and a separate exact approval is provided.',
    }), {
      phase: 'post_launch_crm',
      blocksExactPublicSendApprovalReadiness: false,
    }),
    withGateMeta(buildGate({
      id: 'exact_live_approval',
      label: 'Exact public/audience send approval is available',
      ready: exactPublicSendApprovalAlreadyQueued,
      evidence: {
        approvalQueueStatus: approvalQueue?.status ?? null,
        readyApprovalIds: approvalQueue?.executiveSummary?.readyApprovalIds ?? [],
        blockedApprovalIds: approvalQueue?.executiveSummary?.blockedApprovalIds ?? [],
        openLiveMutationGateCount: approvalQueue?.executiveSummary?.openLiveMutationGateCount ?? null,
      },
      blockers: exactPublicSendApprovalAlreadyQueued ? [] : ['exact_public_send_approval_not_yet_requested_or_matched'],
      nextSafeAction: 'Ask for exact public/audience send approval only after all pre-send gates are ready and explained.',
    }), {
      phase: 'approval_boundary',
      blocksExactPublicSendApprovalReadiness: false,
    }),
  ];

  const preSendGates = gates.filter((gate) => gate.blocksExactPublicSendApprovalReadiness);
  const postLaunchCrmGates = gates.filter((gate) => gate.phase === 'post_launch_crm');
  const approvalExecutionGates = gates.filter((gate) =>
    gate.phase === 'approval_boundary' || gate.phase === 'approval_execution');
  const blockersBeforeExactPublicSendApproval = [
    ...new Set(preSendGates.flatMap((gate) => gate.blockers)),
  ];
  const postLaunchCrmBlockers = [
    ...new Set(postLaunchCrmGates.flatMap((gate) => gate.blockers)),
  ];
  const approvalExecutionBlockers = [
    ...new Set(approvalExecutionGates.flatMap((gate) => gate.blockers)),
  ];
  const readyForExactPublicSendApproval = preSendGates.every((gate) => gate.ready);
  const status = readyForExactPublicSendApproval
    ? 'mini_launch_public_launch_readiness_ready_for_exact_approval_no_live_changes'
    : seedInboxQaGreen
      ? 'mini_launch_public_launch_readiness_blocked_after_green_seed_qa_no_live_changes'
      : 'mini_launch_public_launch_readiness_blocked_missing_evidence_no_live_changes';

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_mini_launch_public_launch_readiness_packet',
    generatedAt,
    ok: true,
    status,
    launch: {
      launchId: assetManifest?.launch?.launchId ?? null,
      resourceName: assetManifest?.launch?.resourceName ?? 'Inteligencia para descansar',
      resourceType: assetManifest?.launch?.resourceType ?? 'quiz',
    },
    executiveSummary: {
      seedInboxQaGreen,
      rawSeedInboxQaGreen,
      seedInboxQaAppliesToCurrentReplacementReceipt,
      approvedSeedDeliveredCount: nullAudienceSeedInboxQa?.deliverySummary?.deliveredToApprovedSeed ?? null,
      expectedSeedMessages: nullAudienceSeedInboxQa?.deliverySummary?.expectedSeedMessages ?? null,
      nullAudienceReplacementDraftsReady: nullAudienceDraftsReady,
      replacementDraftCount: nullAudienceReplacementExecutionReceipt?.postCreateQa?.replacementDraftCount ?? null,
      previewLinksReady: previewRouteReady,
      finalPublicLinksReady,
      publicAudienceSendUrlGateReady,
      canUsePreviewLinksForPublicAudienceSend:
        shopifyPreviewRouteExecutionReceipt?.executionSummary?.canUseForPublicAudienceSend ?? null,
      publicAudienceScopeReady,
      crmObservedEventsReady,
      postLaunchCrmWriteReady: crmObservedEventsReady,
      exactPublicSendApprovalAlreadyQueued,
      readyForExactPublicSendApproval,
      readyForLiveOperation: false,
      canAskAlejandroForPublicSendApprovalNow: readyForExactPublicSendApproval,
      liveActionAllowedNow: false,
      blockerCount: blockersBeforeExactPublicSendApproval.length,
      postLaunchCrmBlockerCount: postLaunchCrmBlockers.length,
      approvalExecutionBlockerCount: approvalExecutionBlockers.length,
      nextSafeAction: readyForExactPublicSendApproval
        ? 'Prepare an exact public/audience send approval request only; do not execute it from this packet.'
        : 'Keep work local-only and resolve URL/audience gates before any public/audience send request.',
    },
    gateMatrix: gates,
    blockersBeforePublicLaunch: blockersBeforeExactPublicSendApproval,
    blockersBeforeExactPublicSendApproval,
    postLaunchCrmBlockers,
    approvalExecutionBlockers,
    readinessPolicy: {
      exactApprovalReadinessRequires: preSendGates.map((gate) => gate.id),
      postLaunchCrmWritesAreNotPreSendBlockers: true,
      nullAudienceDraftAssignmentIsNotPreSendBlocker: true,
      exactApprovalTextIsNotRequiredBeforeReadiness: true,
      executionStillRequiresExactApproval: true,
      rationale: 'CRM observed events and Fact Store write evidence are post-launch artifacts, and assigning replacement drafts from the empty safety audience to a real audience is an execution step. Those gates remain closed, but they cannot be required before asking for a public/audience send approval.',
    },
    hardStops: [
      'No public or audience send.',
      'No publish or schedule.',
      'No workflow or automation changes.',
      'No subscriber imports, mutations or non-seed assignments.',
      'No new group or segment creation/assignment.',
      'No Shopify additional mutation or publish.',
      'No CRM live API writes, Signal Ledger append, card writes, scoring changes or Fact Store writes.',
      'No exact live/public approval phrase printed or requested from this packet.',
    ],
    nextSafeMoves: [
      'Use the green seed inbox QA as test-only evidence.',
      'Keep Null Audience drafts inert until an audience packet exists.',
      'Promote or approve the URL lifecycle before any audience-send boundary.',
      'Define public/audience scope separately; never infer it from the empty safety group.',
      'Keep CRM writes blocked until real observed events exist after public/external signals; seed QA is not CRM write evidence.',
      'Regenerate Launch OS current-state reports after this packet so runbook/audit/receipt reflect the public-launch boundary.',
    ],
    sourceDigests,
    safety,
  };
};

const loadPacketFromFiles = async (options) => {
  const sources = await Promise.all([
    readJsonWithDigest(options.assetManifest, 'asset slots, preview/live URL lifecycle and footer policy'),
    readJsonWithDigest(options.shopifyPublicUrlGate, 'public/audience URL gate state'),
    readJsonWithDigest(options.shopifyPreviewRouteExecutionReceipt, 'preview route QA and noindex evidence'),
    readJsonWithDigest(options.publicAudienceScopePacket, 'public/audience scope options and current audience blockers'),
    readJsonWithDigest(options.nullAudienceReplacementExecutionReceipt, 'Null Audience replacement draft safety'),
    readJsonWithDigest(options.nullAudienceSeedInboxQa, 'seed inbox delivery and content QA evidence'),
    readJsonWithDigest(options.crmWriteApprovalPacket, 'CRM write blockers and observed-event readiness'),
    readJsonWithDigest(options.approvalQueue, 'current exact approval queue state'),
  ]);

  return buildPublicLaunchReadinessPacket({
    assetManifest: sources[0].value,
    shopifyPublicUrlGate: sources[1].value,
    shopifyPreviewRouteExecutionReceipt: sources[2].value,
    publicAudienceScopePacket: sources[3].value,
    nullAudienceReplacementExecutionReceipt: sources[4].value,
    nullAudienceSeedInboxQa: sources[5].value,
    crmWriteApprovalPacket: sources[6].value,
    approvalQueue: sources[7].value,
    sourceDigests: sources.map((source) => source.digest),
  });
};

const renderList = (items) => (items.length ? items.map((item) => `- ${item}`).join('\n') : '- none');

const renderMarkdown = (report) => [
  '# MailerLite Mini-Launch Public Launch Readiness Packet',
  '',
  `Generated: ${report.generatedAt}`,
  `Status: ${report.status}`,
  `Launch: ${report.launch.resourceName}`,
  '',
  '## Executive Summary',
  '',
  `- Seed inbox QA green: ${report.executiveSummary.seedInboxQaGreen}`,
  `- Null Audience replacement drafts ready: ${report.executiveSummary.nullAudienceReplacementDraftsReady}`,
  `- Preview links ready: ${report.executiveSummary.previewLinksReady}`,
  `- Final public links ready: ${report.executiveSummary.finalPublicLinksReady}`,
  `- Public/audience URL gate ready: ${report.executiveSummary.publicAudienceSendUrlGateReady}`,
  `- Public/audience scope ready: ${report.executiveSummary.publicAudienceScopeReady}`,
  `- CRM observed events ready: ${report.executiveSummary.crmObservedEventsReady}`,
  `- Post-launch CRM write ready: ${report.executiveSummary.postLaunchCrmWriteReady}`,
  `- Exact public send approval already queued: ${report.executiveSummary.exactPublicSendApprovalAlreadyQueued}`,
  `- Ready for exact public send approval: ${report.executiveSummary.readyForExactPublicSendApproval}`,
  `- Live action allowed now: ${report.executiveSummary.liveActionAllowedNow}`,
  `- Pre-send blocker count: ${report.executiveSummary.blockerCount}`,
  `- Post-launch CRM blocker count: ${report.executiveSummary.postLaunchCrmBlockerCount}`,
  `- Next safe action: ${report.executiveSummary.nextSafeAction}`,
  '',
  '## Readiness Policy',
  '',
  `- Exact approval readiness requires: ${report.readinessPolicy.exactApprovalReadinessRequires.join(', ')}`,
  `- Post-launch CRM writes are not pre-send blockers: ${report.readinessPolicy.postLaunchCrmWritesAreNotPreSendBlockers}`,
  `- Null Audience draft assignment is not a pre-send blocker: ${report.readinessPolicy.nullAudienceDraftAssignmentIsNotPreSendBlocker}`,
  `- Exact approval text is not required before readiness: ${report.readinessPolicy.exactApprovalTextIsNotRequiredBeforeReadiness}`,
  `- Execution still requires exact approval: ${report.readinessPolicy.executionStillRequiresExactApproval}`,
  `- Rationale: ${report.readinessPolicy.rationale}`,
  '',
  '## Gate Matrix',
  '',
  renderList(report.gateMatrix.map((gate) =>
    `${gate.id}: ${gate.status}; phase=${gate.phase}; blocksExactApprovalReadiness=${gate.blocksExactPublicSendApprovalReadiness}; blockers=${gate.blockers.join('|') || 'none'}; next=${gate.nextSafeAction}`)),
  '',
  '## Blockers Before Exact Public Send Approval',
  '',
  renderList(report.blockersBeforeExactPublicSendApproval),
  '',
  '## Post-Launch CRM Blockers',
  '',
  renderList(report.postLaunchCrmBlockers),
  '',
  '## Approval Execution Blockers',
  '',
  renderList(report.approvalExecutionBlockers),
  '',
  '## Hard Stops',
  '',
  renderList(report.hardStops),
  '',
  '## Next Safe Moves',
  '',
  renderList(report.nextSafeMoves),
  '',
  '## Safety',
  '',
  `- Local only: ${report.safety.localOnly}`,
  `- Reports only: ${report.safety.reportsOnly}`,
  `- MailerLite API called: ${report.safety.mailerLiteApiCalled}`,
  `- MailerLite UI used: ${report.safety.mailerLiteUiUsed}`,
  `- Shopify API called: ${report.safety.shopifyApiCalled}`,
  `- CRM live API called: ${report.safety.crmLiveApiCalled}`,
  `- Sends performed: ${report.safety.sendsPerformed}`,
  `- Subscriber mutations performed: ${report.safety.subscriberMutationsPerformed}`,
  `- Workflow mutations performed: ${report.safety.workflowMutationsPerformed}`,
  `- Fact Store write performed: ${report.safety.factStoreWritePerformed}`,
  `- Raw IDs printed: ${report.safety.rawIdsPrinted}`,
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
    seedInboxQaGreen: report.executiveSummary.seedInboxQaGreen,
    nullAudienceReplacementDraftsReady: report.executiveSummary.nullAudienceReplacementDraftsReady,
    previewLinksReady: report.executiveSummary.previewLinksReady,
    publicAudienceSendUrlGateReady: report.executiveSummary.publicAudienceSendUrlGateReady,
    publicAudienceScopeReady: report.executiveSummary.publicAudienceScopeReady,
    crmObservedEventsReady: report.executiveSummary.crmObservedEventsReady,
    postLaunchCrmWriteReady: report.executiveSummary.postLaunchCrmWriteReady,
    exactPublicSendApprovalAlreadyQueued: report.executiveSummary.exactPublicSendApprovalAlreadyQueued,
    readyForExactPublicSendApproval: report.executiveSummary.readyForExactPublicSendApproval,
    liveActionAllowedNow: report.executiveSummary.liveActionAllowedNow,
    blockerCount: report.executiveSummary.blockerCount,
    postLaunchCrmBlockerCount: report.executiveSummary.postLaunchCrmBlockerCount,
    approvalExecutionBlockerCount: report.executiveSummary.approvalExecutionBlockerCount,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: report.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite mini-launch public launch readiness packet failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildPublicLaunchReadinessPacket,
  buildSafety,
  parseArgs,
  renderMarkdown,
};
