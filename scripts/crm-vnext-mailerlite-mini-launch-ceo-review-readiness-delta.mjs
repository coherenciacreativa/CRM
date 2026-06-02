#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-ceo-review-readiness-delta-2026-06-02';
const DEFAULT_REPORTS_DIR = '/Users/alejandrogomez/Documents/Mantis-Reports';
const DEFAULT_PRODUCT_VALUE_REVIEW_PACKET =
  `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_product_value_review_packet_current_inteligencia_descansar_2026-06-02.json`;
const DEFAULT_INTEGRATED_EXPERIENCE_QA_PACKET =
  `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_integrated_experience_qa_packet_current_inteligencia_descansar_2026-06-02.json`;
const DEFAULT_PUBLIC_LAUNCH_READINESS_PACKET =
  `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_public_launch_readiness_packet_current_inteligencia_descansar_2026-06-02.json`;
const DEFAULT_COMPACT_FOOTER_REPLACEMENT_RECEIPT =
  `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_null_audience_replacement_execution_receipt_footer_compact_canon_inteligencia_descansar_2026-06-02.json`;
const DEFAULT_COMPACT_FOOTER_SEED_PREFLIGHT =
  `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_null_audience_seed_test_send_preflight_footer_compact_canon_inteligencia_descansar_2026-06-02.json`;
const DEFAULT_COMPACT_FOOTER_SEED_UI_BLOCKER =
  `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_null_audience_seed_test_send_ui_blocker_footer_compact_canon_inteligencia_descansar_2026-06-02.json`;
const DEFAULT_CURRENT_STATE_REFRESH =
  `${DEFAULT_REPORTS_DIR}/mailerlite_launch_os_current_state_refresh_current_2026-06-02.json`;
const DEFAULT_GOAL_AUDIT =
  `${DEFAULT_REPORTS_DIR}/mailerlite_launch_os_v0_goal_audit_current_2026-06-02.json`;
const DEFAULT_OUTPUT =
  `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_ceo_review_readiness_delta_current_inteligencia_descansar_2026-06-02.json`;
const DEFAULT_MARKDOWN_OUTPUT =
  `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_ceo_review_readiness_delta_current_inteligencia_descansar_2026-06-02.md`;

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-ceo-review-readiness-delta.mjs [options]

Options:
  --product-value-review-packet <path>       Product/Value review JSON. Defaults to ${DEFAULT_PRODUCT_VALUE_REVIEW_PACKET}
  --integrated-experience-qa-packet <path>   Integrated experience QA JSON. Defaults to ${DEFAULT_INTEGRATED_EXPERIENCE_QA_PACKET}
  --public-launch-readiness-packet <path>    Public launch readiness JSON. Defaults to ${DEFAULT_PUBLIC_LAUNCH_READINESS_PACKET}
  --compact-footer-replacement-receipt <path> Compact-footer Null Audience replacement receipt. Defaults to ${DEFAULT_COMPACT_FOOTER_REPLACEMENT_RECEIPT}
  --compact-footer-seed-preflight <path>     Compact-footer seed-test preflight JSON. Defaults to ${DEFAULT_COMPACT_FOOTER_SEED_PREFLIGHT}
  --compact-footer-seed-ui-blocker <path>    Compact-footer seed-test UI blocker/partial receipt JSON. Defaults to ${DEFAULT_COMPACT_FOOTER_SEED_UI_BLOCKER}
  --current-state-refresh <path>             Current-state refresh JSON. Defaults to ${DEFAULT_CURRENT_STATE_REFRESH}
  --goal-audit <path>                        Goal audit JSON. Defaults to ${DEFAULT_GOAL_AUDIT}
  --out <path>                               Write JSON report. Defaults to ${DEFAULT_OUTPUT}
  --markdown-out <path>                      Write Markdown report. Defaults to ${DEFAULT_MARKDOWN_OUTPUT}
  --help                                     Show this help

Local-only CEO-review readiness delta for the Inteligencia para descansar
mini-launch. It consolidates the compact-footer evidence after the semantic UI
blocker. It never opens UI, calls MailerLite/Shopify/CRM APIs, reads or mutates
subscribers, creates groups, edits workflows, sends emails, publishes pages,
appends ledgers, writes cards/scoring, writes Fact Store, or prints exact
URLs/tokens/recipients.`;

const EXPECTED_LABELS = ['E01', 'E02', 'E03', 'E04'];

const parseArgs = (argv) => {
  const options = {
    productValueReviewPacket: DEFAULT_PRODUCT_VALUE_REVIEW_PACKET,
    integratedExperienceQaPacket: DEFAULT_INTEGRATED_EXPERIENCE_QA_PACKET,
    publicLaunchReadinessPacket: DEFAULT_PUBLIC_LAUNCH_READINESS_PACKET,
    compactFooterReplacementReceipt: DEFAULT_COMPACT_FOOTER_REPLACEMENT_RECEIPT,
    compactFooterSeedPreflight: DEFAULT_COMPACT_FOOTER_SEED_PREFLIGHT,
    compactFooterSeedUiBlocker: DEFAULT_COMPACT_FOOTER_SEED_UI_BLOCKER,
    currentStateRefresh: DEFAULT_CURRENT_STATE_REFRESH,
    goalAudit: DEFAULT_GOAL_AUDIT,
    out: DEFAULT_OUTPUT,
    markdownOut: DEFAULT_MARKDOWN_OUTPUT,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--product-value-review-packet') options.productValueReviewPacket = argv[++index];
    else if (arg === '--integrated-experience-qa-packet') options.integratedExperienceQaPacket = argv[++index];
    else if (arg === '--public-launch-readiness-packet') options.publicLaunchReadinessPacket = argv[++index];
    else if (arg === '--compact-footer-replacement-receipt') options.compactFooterReplacementReceipt = argv[++index];
    else if (arg === '--compact-footer-seed-preflight') options.compactFooterSeedPreflight = argv[++index];
    else if (arg === '--compact-footer-seed-ui-blocker') options.compactFooterSeedUiBlocker = argv[++index];
    else if (arg === '--current-state-refresh') options.currentStateRefresh = argv[++index];
    else if (arg === '--goal-audit') options.goalAudit = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  return options;
};

const sha256 = (value) => createHash('sha256').update(String(value)).digest('hex');
const unique = (items) => [...new Set((items ?? []).filter(Boolean))];
const asArray = (value) => (Array.isArray(value) ? value : []);

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
  externalMessagesSent: false,
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
  segmentMutationsPerformed: false,
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

const safetyClosed = (safety) => Object.entries(safety).every(([key, value]) => (
  key === 'localOnly' || key === 'reportsOnly' ? value === true : value === false
));

const buildGate = ({ id, status, ready, blockers = [], evidence = {} }) => ({
  id,
  status,
  ready,
  blockers,
  evidence,
});

const expectedLabelCoverage = (labels) =>
  EXPECTED_LABELS.every((label) => labels.includes(label));

const countReadyRows = (rows, predicate) =>
  asArray(rows).filter((row) => predicate(row)).length;

const buildCeoReviewReadinessDelta = ({
  productValueReviewPacket,
  integratedExperienceQaPacket,
  publicLaunchReadinessPacket,
  compactFooterReplacementReceipt,
  compactFooterSeedPreflight,
  compactFooterSeedUiBlocker,
  currentStateRefresh,
  goalAudit,
  generatedAt = new Date().toISOString(),
}) => {
  const safety = buildSafety();

  const productSummary = productValueReviewPacket?.executiveSummary ?? {};
  const integratedSummary = integratedExperienceQaPacket?.executiveSummary ?? {};
  const publicSummary = publicLaunchReadinessPacket?.executiveSummary ?? {};
  const replacementQa = compactFooterReplacementReceipt?.postCreateQa ?? {};
  const replacementRows = asArray(replacementQa.rows);
  const seedPreflight = compactFooterSeedPreflight?.preflight ?? {};
  const uiApproval = compactFooterSeedUiBlocker?.approval ?? {};
  const uiExecution = compactFooterSeedUiBlocker?.uiExecution ?? {};
  const uiPolicy = compactFooterSeedUiBlocker?.operatorPolicy ?? {};
  const freshPreflight = compactFooterSeedUiBlocker?.freshPreflight ?? {};
  const goalSummary = goalAudit?.executiveSummary ?? {};

  const productValueReady = productSummary.productValueReviewPassed === true
    && productSummary.ceoReviewValueReady === true
    && (productSummary.blockerCount ?? 0) === 0;

  const integratedExperienceReady = integratedSummary.ceoReviewReady === true
    && integratedSummary.integratedExperienceReady === true
    && (integratedSummary.blockerCount ?? 0) === 0;

  const compactFooterDraftsReady = compactFooterReplacementReceipt?.ok === true
    && compactFooterReplacementReceipt?.status === 'mailerlite_null_audience_replacement_execution_completed_no_sends'
    && replacementQa.replacementDraftCount === 4
    && replacementQa.nullAudienceSafeCount === 4
    && replacementQa.contentGreenCount === 4
    && countReadyRows(replacementRows, (row) => row.nullAudienceSafe === true
      && row.contentHasPlaceholder === false
      && row.observed?.status === 'draft'
      && row.observed?.groupActiveCount === 0
      && row.observed?.filterGroupIdCount === 1
      && row.observed?.filterSegmentIdCount === 0
      && row.observed?.scheduledFor === null
      && row.observed?.usedInAutomations === false) === 4;

  const seedPreflightGreen = compactFooterSeedPreflight?.ok === true
    && compactFooterSeedPreflight?.status === 'mailerlite_null_audience_seed_test_send_preflight_ready_for_exact_approval'
    && seedPreflight.targetCount === 4
    && seedPreflight.qaGreenCount === 4
    && seedPreflight.safetyGroupActiveCount === 0
    && asArray(compactFooterSeedPreflight?.targetPlan).every((row) =>
      row.status === 'draft'
      && row.nullAudienceSafe === true
      && row.contentMatchesCreationReceipt === true
      && row.placeholderCount === 0
      && row.redactedFinalLinkTokenCount === 0
      && asArray(row.rowBlockers).length === 0);

  const sentLabels = unique(uiExecution.sentLabels);
  const unsentLabels = unique(uiApproval.remainingUnsentLabels ?? uiExecution.unsentLabels);
  const doNotResendLabels = unique(uiApproval.doNotResendLabels);
  const seedExecutionComplete = expectedLabelCoverage(sentLabels)
    && uiExecution.recordUiSentReceiptCreated === true
    && uiExecution.computerUseSemanticSendCompleted === 'all_e01_e02_e03_e04';
  const seedExecutionPartial = sentLabels.length > 0 && !seedExecutionComplete;
  const seedExecutionBlocked = !seedExecutionComplete;

  const strictSemanticUiPolicy = uiPolicy.screenshotsOrCapturesAllowedForUiOperation === false
    && uiPolicy.coordinateClicksAllowed === false
    && uiPolicy.systemClickFallbackAllowed === false
    && uiPolicy.browserDomOrAppleScriptClickInjectionAllowed === false
    && uiPolicy.apiTestSendEndpointAllowedAsPrimaryRoute === false;

  const publicSendReady = publicSummary.readyForExactPublicSendApproval === true
    && publicSummary.liveActionAllowedNow === true;

  const ceoReviewPackageReady = productValueReady
    && integratedExperienceReady
    && compactFooterDraftsReady
    && seedExecutionComplete;

  const gateMatrix = [
    buildGate({
      id: 'product_value_review',
      ready: productValueReady,
      status: productValueReady ? 'ready_for_ceo_value_review' : 'blocked',
      blockers: productSummary.blockers ?? [],
      evidence: {
        status: productValueReviewPacket?.status,
        readyGateCount: productSummary.readyGateCount ?? null,
        blockerCount: productSummary.blockerCount ?? null,
        clickthroughVerified: productSummary.clickthroughVerified ?? null,
      },
    }),
    buildGate({
      id: 'compact_footer_null_audience_drafts',
      ready: compactFooterDraftsReady,
      status: compactFooterDraftsReady ? 'ready_draft_only_null_audience' : 'blocked_or_unproven',
      blockers: compactFooterDraftsReady ? [] : ['compact_footer_replacement_receipt_not_green'],
      evidence: {
        status: compactFooterReplacementReceipt?.status,
        replacementDraftCount: replacementQa.replacementDraftCount ?? null,
        nullAudienceSafeCount: replacementQa.nullAudienceSafeCount ?? null,
        contentGreenCount: replacementQa.contentGreenCount ?? null,
      },
    }),
    buildGate({
      id: 'compact_footer_seed_preflight',
      ready: seedPreflightGreen,
      status: seedPreflightGreen ? 'fresh_preflight_green_for_exact_seed_boundary' : 'blocked_or_stale',
      blockers: seedPreflightGreen ? [] : ['fresh_compact_footer_seed_preflight_not_green'],
      evidence: {
        status: compactFooterSeedPreflight?.status,
        generatedAt: compactFooterSeedPreflight?.generatedAt ?? null,
        targetCount: seedPreflight.targetCount ?? freshPreflight.targetCount ?? null,
        qaGreenCount: seedPreflight.qaGreenCount ?? freshPreflight.qaGreenCount ?? null,
        safetyGroupActiveCount: seedPreflight.safetyGroupActiveCount ?? freshPreflight.safetyGroupActiveCount ?? null,
      },
    }),
    buildGate({
      id: 'compact_footer_seed_execution',
      ready: seedExecutionComplete,
      status: seedExecutionComplete
        ? 'complete_record_ui_sent_ready'
        : seedExecutionPartial
          ? 'partial_e01_only_remaining_labels_blocked_by_semantic_ui'
          : 'not_started_or_unproven',
      blockers: seedExecutionBlocked ? [
        uiExecution.blocker ?? 'remaining_seed_tests_not_completed',
      ] : [],
      evidence: {
        approvalConsumed: uiApproval.compactFooterSeedTestApprovalConsumed ?? null,
        sentLabels,
        unsentLabels,
        doNotResendLabels,
        recordUiSentReceiptCreated: uiExecution.recordUiSentReceiptCreated ?? false,
        semanticSuccessObservedText: uiExecution.semanticSuccessObservedText ?? null,
        strictSemanticUiPolicy,
      },
    }),
    buildGate({
      id: 'integrated_experience_ceo_review',
      ready: integratedExperienceReady,
      status: integratedExperienceReady ? 'ready_for_ceo_review' : 'blocked_before_ceo_review',
      blockers: integratedSummary.blockers ?? [],
      evidence: {
        status: integratedExperienceQaPacket?.status,
        blockerCount: integratedSummary.blockerCount ?? null,
        productValueReviewPassed: integratedSummary.productValueReviewPassed ?? null,
        distributionDecisionShouldWait: integratedSummary.distributionDecisionShouldWait ?? null,
      },
    }),
    buildGate({
      id: 'public_or_audience_send',
      ready: publicSendReady,
      status: 'closed_not_ready_for_exact_public_send_approval',
      blockers: ['public_send_gate_not_part_of_ceo_delta'],
      evidence: {
        status: publicLaunchReadinessPacket?.status,
        readyForExactPublicSendApproval: publicSummary.readyForExactPublicSendApproval ?? null,
        publicAudienceSendUrlGateReady: publicSummary.publicAudienceSendUrlGateReady ?? null,
        publicAudienceScopeReady: publicSummary.publicAudienceScopeReady ?? null,
        crmObservedEventsReady: publicSummary.crmObservedEventsReady ?? null,
      },
    }),
  ];

  const blockerIds = unique([
    ...gateMatrix.flatMap((entry) => entry.ready ? [] : entry.blockers),
    ...(seedExecutionBlocked && unsentLabels.length > 0 ? ['compact_footer_remaining_seed_tests_unsent'] : []),
  ]);

  const report = {
    schemaVersion: SCHEMA_VERSION,
    generatedAt,
    ok: true,
    status: ceoReviewPackageReady
      ? 'ceo_review_readiness_delta_ready_no_live_changes'
      : 'ceo_review_readiness_delta_not_ready_no_live_changes',
    launch: {
      launchId: 'mini_2026_06_rehearsal_inteligencia_para_descansar',
      resourceName: 'Inteligencia para descansar',
      evidenceSet: 'compact_footer_canon_null_audience_replacement',
    },
    executiveSummary: {
      ceoReviewPackageReady,
      ceoReviewValueReady: productValueReady,
      integratedExperienceReady,
      compactFooterDraftsReady,
      compactFooterSeedPreflightGreen: seedPreflightGreen,
      compactFooterSeedExecutionComplete: seedExecutionComplete,
      compactFooterSeedExecutionState: seedExecutionComplete
        ? 'complete_e01_e02_e03_e04'
        : seedExecutionPartial
          ? 'partial_e01_only_remaining_e02_e03_e04_blocked'
          : 'not_started_or_unproven',
      readyForPilotDistributionDecisionNow: integratedExperienceReady
        && seedExecutionComplete
        && integratedSummary.canAskPilotDistributionDecisionNow === true,
      readyForPublicSendApprovalNow: false,
      liveActionAllowedNow: false,
      productValueReviewStatus: productValueReviewPacket?.status ?? null,
      integratedExperienceStatus: integratedExperienceQaPacket?.status ?? null,
      publicLaunchReadinessStatus: publicLaunchReadinessPacket?.status ?? null,
      goalAuditStatus: goalAudit?.status ?? null,
      currentOperatingPosture: goalSummary.currentOperatingPosture ?? 'continue_no_live_build_and_reviews',
      blockerCount: blockerIds.length,
      blockerIds,
      sentLabels,
      unsentLabels,
      doNotResendLabels,
      nextSafeAction: seedExecutionBlocked
        ? 'choose_semantic_ui_retry_only_if_control_is_exposed_or_explicitly_approve_a_different_test_send_route_before_e02_e03_e04'
        : 'rerun_seed_inbox_qa_then_integrated_experience_qa_before_distribution_decision',
    },
    gateMatrix,
    decisionBoundary: {
      status: seedExecutionBlocked
        ? 'human_route_decision_required_for_remaining_seed_tests_or_ceo_review_with_caveat'
        : 'seed_execution_complete_continue_local_qa',
      currentApprovalState: uiApproval.compactFooterSeedTestApprovalConsumed ?? 'unknown',
      doNotAskSameApprovalAgainUnlessEvidenceChanges:
        compactFooterSeedUiBlocker?.nextBoundary?.doNotAskSameApprovalAgainUnlessEvidenceChanges ?? true,
      allowedNextChoices: [
        'continue_e02_e03_e04_only_after_fresh_preflight_if_computer_use_exposes_semantic_controls',
        'explicitly_approve_a_different_test_send_route_for_e02_e03_e04_only',
        'park_compact_seed_completion_and_hold_ceo_review_as_value_ready_but_integrated_experience_not_ready',
        'repair_signature_and_footer_proof_inputs_then_rerun_integrated_experience_qa',
      ],
      notAllowedWithoutFreshApprovalOrEvidence: [
        'resend_e01',
        'use_screenshots_or_coordinates_for_ui_operation',
        'use_api_test_send_as_primary_route',
        'public_or_audience_send',
        'shopify_publish_or_live_form_wiring',
        'crm_live_writes_ledgers_cards_scoring_or_fact_store',
      ],
    },
    sourceDigests: [],
    safety,
    hardStops: [
      'This delta is not approval for a tester, audience, public send, publish, workflow or CRM write.',
      'Do not resend E01 under the compact-footer seed-test approval.',
      'Before any remaining seed send, run a fresh API re-scan/preflight and require QA green.',
      'Operate MailerLite UI only through Computer Use semantic controls unless Alejandro explicitly approves a different route.',
      'Exact URLs, recipients, raw IDs and tokens must remain unprinted.',
    ],
    inputStatuses: {
      currentStateRefresh: currentStateRefresh?.status ?? null,
      goalAudit: goalAudit?.status ?? null,
    },
  };

  report.safetyClosed = safetyClosed(report.safety);
  return report;
};

const renderList = (items) => items.map((item) => `- ${item}`).join('\n');

const renderMarkdown = (report) => [
  '# MailerLite Mini-launch CEO-review Readiness Delta',
  '',
  `Generated: ${report.generatedAt}`,
  `Status: ${report.status}`,
  '',
  '## Executive Summary',
  '',
  `- CEO-review package ready: ${report.executiveSummary.ceoReviewPackageReady}`,
  `- CEO-review value ready: ${report.executiveSummary.ceoReviewValueReady}`,
  `- Integrated experience ready: ${report.executiveSummary.integratedExperienceReady}`,
  `- Compact-footer drafts ready: ${report.executiveSummary.compactFooterDraftsReady}`,
  `- Compact-footer seed preflight green: ${report.executiveSummary.compactFooterSeedPreflightGreen}`,
  `- Compact-footer seed execution state: ${report.executiveSummary.compactFooterSeedExecutionState}`,
  `- Sent labels: ${report.executiveSummary.sentLabels.join(', ') || 'none'}`,
  `- Remaining unsent labels: ${report.executiveSummary.unsentLabels.join(', ') || 'none'}`,
  `- Do not resend labels: ${report.executiveSummary.doNotResendLabels.join(', ') || 'none'}`,
  `- Ready for pilot distribution decision now: ${report.executiveSummary.readyForPilotDistributionDecisionNow}`,
  `- Ready for public send approval now: ${report.executiveSummary.readyForPublicSendApprovalNow}`,
  `- Live action allowed now: ${report.executiveSummary.liveActionAllowedNow}`,
  `- Blocker count: ${report.executiveSummary.blockerCount}`,
  `- Next safe action: ${report.executiveSummary.nextSafeAction}`,
  '',
  '## Gate Matrix',
  '',
  ...report.gateMatrix.map((entry) =>
    `- ${entry.id}: ${entry.status}; ready=${entry.ready}; blockers=${entry.blockers.join(', ') || 'none'}`
  ),
  '',
  '## Decision Boundary',
  '',
  `- Status: ${report.decisionBoundary.status}`,
  `- Current approval state: ${report.decisionBoundary.currentApprovalState}`,
  `- Do not ask same approval again unless evidence changes: ${report.decisionBoundary.doNotAskSameApprovalAgainUnlessEvidenceChanges}`,
  '',
  'Allowed next choices:',
  renderList(report.decisionBoundary.allowedNextChoices),
  '',
  'Not allowed without fresh approval or evidence:',
  renderList(report.decisionBoundary.notAllowedWithoutFreshApprovalOrEvidence),
  '',
  '## Safety',
  '',
  '- Local-only/report-only delta.',
  '- UI opened: false.',
  '- MailerLite API called by this delta: false.',
  '- Shopify API called: false.',
  '- CRM live API called: false.',
  '- Sends/subscriber/group/workflow mutations: false.',
  '- Exact URLs, recipients, raw IDs and tokens printed: false.',
  '',
  '## Hard Stops',
  '',
  renderList(report.hardStops),
  '',
].join('\n');

const writeText = async (path, content) => {
  const resolved = resolve(path);
  await mkdir(dirname(resolved), { recursive: true });
  await writeFile(resolved, content);
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const [
    productValueReviewPacket,
    integratedExperienceQaPacket,
    publicLaunchReadinessPacket,
    compactFooterReplacementReceipt,
    compactFooterSeedPreflight,
    compactFooterSeedUiBlocker,
    currentStateRefresh,
    goalAudit,
  ] = await Promise.all([
    readJsonWithDigest(options.productValueReviewPacket, 'Product/Value CEO-review gate'),
    readJsonWithDigest(options.integratedExperienceQaPacket, 'integrated experience CEO-review gate'),
    readJsonWithDigest(options.publicLaunchReadinessPacket, 'public/audience send gate posture'),
    readJsonWithDigest(options.compactFooterReplacementReceipt, 'compact-footer Null Audience replacement draft QA'),
    readJsonWithDigest(options.compactFooterSeedPreflight, 'compact-footer seed-test fresh preflight evidence'),
    readJsonWithDigest(options.compactFooterSeedUiBlocker, 'compact-footer seed-test semantic UI blocker and partial send state'),
    readJsonWithDigest(options.currentStateRefresh, 'Launch OS current-state no-live posture'),
    readJsonWithDigest(options.goalAudit, 'Launch OS goal audit posture'),
  ]);

  const report = buildCeoReviewReadinessDelta({
    productValueReviewPacket: productValueReviewPacket.value,
    integratedExperienceQaPacket: integratedExperienceQaPacket.value,
    publicLaunchReadinessPacket: publicLaunchReadinessPacket.value,
    compactFooterReplacementReceipt: compactFooterReplacementReceipt.value,
    compactFooterSeedPreflight: compactFooterSeedPreflight.value,
    compactFooterSeedUiBlocker: compactFooterSeedUiBlocker.value,
    currentStateRefresh: currentStateRefresh.value,
    goalAudit: goalAudit.value,
  });

  report.sourceDigests = [
    productValueReviewPacket.digest,
    integratedExperienceQaPacket.digest,
    publicLaunchReadinessPacket.digest,
    compactFooterReplacementReceipt.digest,
    compactFooterSeedPreflight.digest,
    compactFooterSeedUiBlocker.digest,
    currentStateRefresh.digest,
    goalAudit.digest,
  ];

  await writeText(options.out, `${JSON.stringify(report, null, 2)}\n`);
  await writeText(options.markdownOut, renderMarkdown(report));

  console.log(JSON.stringify({
    ok: report.ok,
    status: report.status,
    ceoReviewPackageReady: report.executiveSummary.ceoReviewPackageReady,
    ceoReviewValueReady: report.executiveSummary.ceoReviewValueReady,
    integratedExperienceReady: report.executiveSummary.integratedExperienceReady,
    compactFooterDraftsReady: report.executiveSummary.compactFooterDraftsReady,
    compactFooterSeedPreflightGreen: report.executiveSummary.compactFooterSeedPreflightGreen,
    compactFooterSeedExecutionState: report.executiveSummary.compactFooterSeedExecutionState,
    sentLabels: report.executiveSummary.sentLabels,
    unsentLabels: report.executiveSummary.unsentLabels,
    doNotResendLabels: report.executiveSummary.doNotResendLabels,
    readyForPilotDistributionDecisionNow: report.executiveSummary.readyForPilotDistributionDecisionNow,
    readyForPublicSendApprovalNow: report.executiveSummary.readyForPublicSendApprovalNow,
    liveActionAllowedNow: report.executiveSummary.liveActionAllowedNow,
    blockerCount: report.executiveSummary.blockerCount,
    blockerIds: report.executiveSummary.blockerIds,
    decisionBoundaryStatus: report.decisionBoundary.status,
    out: resolve(options.out),
    markdownOut: resolve(options.markdownOut),
    safety: report.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite mini-launch CEO-review readiness delta failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildCeoReviewReadinessDelta,
  parseArgs,
  renderMarkdown,
  safetyClosed,
};
