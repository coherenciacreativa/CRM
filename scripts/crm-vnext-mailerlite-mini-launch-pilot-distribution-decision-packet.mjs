#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-pilot-distribution-decision-packet-2026-06-02';
const DEFAULT_REPORTS_DIR = '/Users/alejandrogomez/Documents/Mantis-Reports';
const DEFAULT_CEO_PROPOSAL_PACKET =
  `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_ceo_proposal_packet_current_inteligencia_descansar_2026-06-02.json`;
const DEFAULT_CEO_REVIEW_READINESS_DELTA =
  `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_ceo_review_readiness_delta_current_inteligencia_descansar_2026-06-02.json`;
const DEFAULT_PUBLIC_SEND_PREFLIGHT_DECISION_PACKET =
  `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_public_send_preflight_decision_packet_current_inteligencia_descansar_2026-06-02.json`;
const DEFAULT_PUBLIC_AUDIENCE_SCOPE_PACKET =
  `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_public_audience_scope_packet_current_inteligencia_descansar_2026-06-02.json`;
const DEFAULT_PILOT_DISTRIBUTION_INPUT_REQUEST_PACKET =
  `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_pilot_distribution_input_request_packet_current_inteligencia_descansar_2026-06-02.json`;
const DEFAULT_OUTPUT =
  `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_pilot_distribution_decision_packet_no_send_current_inteligencia_descansar_2026-06-02.json`;
const DEFAULT_MARKDOWN_OUTPUT =
  `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_pilot_distribution_decision_packet_no_send_current_inteligencia_descansar_2026-06-02.md`;

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-pilot-distribution-decision-packet.mjs [options]

Options:
  --ceo-proposal-packet <path>                 CEO proposal packet JSON. Defaults to ${DEFAULT_CEO_PROPOSAL_PACKET}
  --ceo-review-readiness-delta <path>          CEO review readiness delta JSON. Defaults to ${DEFAULT_CEO_REVIEW_READINESS_DELTA}
  --public-send-preflight-decision-packet <path> Public send preflight decision JSON. Defaults to ${DEFAULT_PUBLIC_SEND_PREFLIGHT_DECISION_PACKET}
  --public-audience-scope-packet <path>        Public audience scope JSON. Defaults to ${DEFAULT_PUBLIC_AUDIENCE_SCOPE_PACKET}
  --pilot-distribution-input-request-packet <path> Existing pilot distribution input request JSON. Defaults to ${DEFAULT_PILOT_DISTRIBUTION_INPUT_REQUEST_PACKET}
  --out <path>                                 Write JSON report. Defaults to ${DEFAULT_OUTPUT}
  --markdown-out <path>                        Write Markdown report. Defaults to ${DEFAULT_MARKDOWN_OUTPUT}
  --help                                       Show this help

Local-only pilot distribution decision packet for the Inteligencia para
descansar mini-launch. It uses the compact-footer v2 CEO-review-ready packet as
evidence and prepares only a no-send strategy choice. It does not ask for or
create a send approval phrase, call MailerLite/Shopify/CRM APIs, open UI, read
or mutate subscribers, assign audiences, create groups or segments, publish,
schedule or send campaigns, append ledgers, write cards/scoring, write Fact
Store, or print exact URLs, raw IDs, recipients or tokens.`;

const parseArgs = (argv) => {
  const options = {
    ceoProposalPacket: DEFAULT_CEO_PROPOSAL_PACKET,
    ceoReviewReadinessDelta: DEFAULT_CEO_REVIEW_READINESS_DELTA,
    publicSendPreflightDecisionPacket: DEFAULT_PUBLIC_SEND_PREFLIGHT_DECISION_PACKET,
    publicAudienceScopePacket: DEFAULT_PUBLIC_AUDIENCE_SCOPE_PACKET,
    pilotDistributionInputRequestPacket: DEFAULT_PILOT_DISTRIBUTION_INPUT_REQUEST_PACKET,
    out: DEFAULT_OUTPUT,
    markdownOut: DEFAULT_MARKDOWN_OUTPUT,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--ceo-proposal-packet') options.ceoProposalPacket = argv[++index];
    else if (arg === '--ceo-review-readiness-delta') options.ceoReviewReadinessDelta = argv[++index];
    else if (arg === '--public-send-preflight-decision-packet') {
      options.publicSendPreflightDecisionPacket = argv[++index];
    } else if (arg === '--public-audience-scope-packet') {
      options.publicAudienceScopePacket = argv[++index];
    } else if (arg === '--pilot-distribution-input-request-packet') {
      options.pilotDistributionInputRequestPacket = argv[++index];
    } else if (arg === '--out') options.out = argv[++index];
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

const readOptionalJsonWithDigest = async (path, consultedFor) => {
  const resolved = resolve(path);
  try {
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
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return {
      value: null,
      digest: {
        path: resolved,
        present: false,
        private: false,
        chars: 0,
        sha256: null,
        consultedFor,
      },
    };
  }
};

const buildSafety = () => ({
  localOnly: true,
  reportsOnly: true,
  uiOpened: false,
  browserOpened: false,
  externalMessagesSent: false,
  exactApprovalPhraseAvailable: false,
  exactApprovalPhrasePrinted: false,
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
  audienceAssignmentPerformed: false,
  signalLedgerAppendPerformed: false,
  crmCardMutationsPerformed: false,
  crmScoreMutationsPerformed: false,
  factStoreWritePerformed: false,
  rawIdsPrinted: false,
  exactUrlsPrinted: false,
  recipientsPrinted: false,
  tokensPrinted: false,
});

const safetyClosed = (safety) => Object.entries(safety)
  .every(([key, value]) => (key === 'localOnly' || key === 'reportsOnly' ? value === true : value === false));

const optionById = (scopePacket, id) =>
  (scopePacket?.audienceScopeOptions ?? []).find((option) => option?.id === id) ?? null;

const decisionOption = ({
  id,
  label,
  posture,
  recommendedNow,
  requiresRosterBeforeFutureUse,
  knownActiveCount = null,
  rationale,
  nextNoLiveStep,
  blockers = [],
}) => ({
  id,
  label,
  posture,
  recommendedNow,
  requiresRosterBeforeFutureUse,
  knownActiveCount,
  rationale,
  nextNoLiveStep,
  wouldAuthorizeSend: false,
  wouldAuthorizeAudienceAssignment: false,
  wouldAuthorizeSubscriberMutation: false,
  wouldAuthorizeWorkflowMutation: false,
  wouldAuthorizeShopifyMutation: false,
  wouldAuthorizeCrmWrite: false,
  exactApprovalPhraseAvailable: false,
  blockers,
});

const buildPilotDistributionDecisionPacket = ({
  ceoProposalPacket,
  ceoReviewReadinessDelta,
  publicSendPreflightDecisionPacket,
  publicAudienceScopePacket,
  pilotDistributionInputRequestPacket = null,
  sourceDigests = [],
  generatedAt = new Date().toISOString(),
}) => {
  const safety = buildSafety();
  const ceoSummary = ceoProposalPacket?.executiveSummary ?? {};
  const deltaSummary = ceoReviewReadinessDelta?.executiveSummary ?? {};
  const preflightSummary = publicSendPreflightDecisionPacket?.executiveSummary ?? {};
  const scopeSummary = publicAudienceScopePacket?.executiveSummary ?? {};
  const inputRequestSummary = pilotDistributionInputRequestPacket?.executiveSummary ?? {};
  const nullAudienceOption = optionById(publicAudienceScopePacket, 'keep_null_audience_no_public_send');
  const microCohortOption = optionById(publicAudienceScopePacket, 'manual_micro_cohort');
  const optInOption = optionById(publicAudienceScopePacket, 'opt_in_testers');
  const existingAudienceOption = optionById(
    publicAudienceScopePacket,
    'existing_legacy_onboarding_complete_campaign_audience',
  );

  const ceoPacketReady = ceoProposalPacket?.status === 'ceo_proposal_packet_ready_for_ceo_review_no_live_changes'
    && ceoSummary.ceoProposalReviewReady === true
    && ceoSummary.ceoProposalReviewReadyWithSeedCaveat === false
    && ceoSummary.compactSeedExecutionComplete === true
    && ceoSummary.publicSendApprovalReady === false
    && ceoSummary.liveActionAllowedNow === false
    && (ceoSummary.blockerCount ?? 0) === 0;
  const ceoReadinessReady =
    ceoReviewReadinessDelta?.status === 'ceo_review_readiness_delta_ready_no_live_changes'
    && deltaSummary.ceoReviewPackageReady === true
    && deltaSummary.readyForPilotDistributionDecisionNow === true
    && deltaSummary.readyForPublicSendApprovalNow === false
    && deltaSummary.liveActionAllowedNow === false
    && (deltaSummary.blockerCount ?? 0) === 0;
  const noSendPreflightAligned =
    preflightSummary.recommendedAudienceScopeId === 'keep_null_audience_no_public_send'
    && preflightSummary.massSubscriberSendRecommendedNow === false
    && preflightSummary.existingActiveSubscriberAudienceFutureOptionOnly === true
    && preflightSummary.exactApprovalPhraseAvailable === false
    && preflightSummary.canExecuteNow === false
    && preflightSummary.liveActionAllowedNow === false;
  const audienceScopeAligned =
    scopeSummary.recommendedDefaultNow === 'keep_null_audience_no_public_send'
    && scopeSummary.currentSafetyGroupActiveCount === 0
    && scopeSummary.massSubscriberSendRecommendedNow === false
    && scopeSummary.existingActiveSubscriberAudienceFutureOptionOnly === true
    && scopeSummary.currentDraftsRemainInertUntilExactApproval === true
    && nullAudienceOption != null
    && microCohortOption != null
    && optInOption != null;
  const priorInputRequestUsable =
    pilotDistributionInputRequestPacket == null
    || inputRequestSummary.recommendedDecisionKind === 'strategy_input_only_no_send'
    || Array.isArray(inputRequestSummary.recommendedDecisionOptions);
  const decisionPacketReady =
    ceoPacketReady
    && ceoReadinessReady
    && noSendPreflightAligned
    && audienceScopeAligned
    && priorInputRequestUsable
    && safetyClosed(safety);
  const blockers = [
    ceoPacketReady ? null : 'ceo_proposal_packet_not_ready',
    ceoReadinessReady ? null : 'ceo_review_readiness_delta_not_ready',
    noSendPreflightAligned ? null : 'public_send_preflight_not_no_send_aligned',
    audienceScopeAligned ? null : 'audience_scope_not_no_send_aligned',
    priorInputRequestUsable ? null : 'pilot_distribution_input_request_not_usable',
  ].filter(Boolean);
  const launch = ceoProposalPacket?.launch
    ?? ceoReviewReadinessDelta?.launch
    ?? {
      launchId: 'mini_2026_06_rehearsal_inteligencia_para_descansar',
      resourceName: 'Inteligencia para descansar',
      resourceType: 'quiz',
    };

  const decisionOptions = [
    decisionOption({
      id: 'keep_null_audience_no_public_send',
      label: 'Keep Null Audience / no send',
      posture: 'safe_hold_current_default',
      recommendedNow: true,
      requiresRosterBeforeFutureUse: false,
      knownActiveCount: nullAudienceOption?.knownActiveCount ?? 0,
      rationale: 'Preserve the green compact-footer v2 drafts and wait until a later exact pilot lane or roster exists.',
      nextNoLiveStep: 'Record the no-send hold and keep the Launch OS in local review/readiness mode.',
    }),
    decisionOption({
      id: 'manual_micro_cohort_next',
      label: 'Prepare manual micro-cohort',
      posture: 'next_learning_lane_requires_exact_people',
      recommendedNow: decisionPacketReady,
      requiresRosterBeforeFutureUse: true,
      knownActiveCount: microCohortOption?.knownActiveCount ?? null,
      rationale: 'A hand-picked micro-cohort can test resonance without turning the full active list into the first market.',
      nextNoLiveStep: 'Prepare only a local roster/preflight packet; do not assign audiences or send.',
      blockers: ['exact_people_or_subscriber_identities_missing'],
    }),
    decisionOption({
      id: 'opt_in_testers_next',
      label: 'Prepare opt-in testers',
      posture: 'next_learning_lane_requires_explicit_opt_in_roster',
      recommendedNow: decisionPacketReady,
      requiresRosterBeforeFutureUse: true,
      knownActiveCount: optInOption?.knownActiveCount ?? null,
      rationale: 'Explicit opt-in keeps the first real exposure consent-based and cleaner for learning.',
      nextNoLiveStep: 'Prepare only a local opt-in roster/preflight packet; do not assign audiences or send.',
      blockers: ['opt_in_tester_roster_missing'],
    }),
    decisionOption({
      id: 'broad_existing_active_subscribers_future_only',
      label: 'Broad existing active subscribers',
      posture: 'future_only_not_a_pilot_default',
      recommendedNow: false,
      requiresRosterBeforeFutureUse: true,
      knownActiveCount: existingAudienceOption?.knownActiveCount ?? null,
      rationale: 'The active list remains relationship capital and should not be the first pilot audience.',
      nextNoLiveStep: 'Defer until a separate campaign strategy gate and exact public/audience approval packet exist.',
      blockers: [
        'campaign_strategy_gate_missing',
        'public_audience_send_url_gate_not_ready',
        'exact_public_send_approval_missing',
      ],
    }),
  ];

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_mini_launch_pilot_distribution_decision_packet_no_send',
    generatedAt,
    ok: true,
    status: decisionPacketReady
      ? 'pilot_distribution_decision_packet_no_send_ready_no_live_changes'
      : 'pilot_distribution_decision_packet_no_send_blocked_missing_evidence_no_live_changes',
    launch,
    executiveSummary: {
      decisionPacketReady,
      ceoPacketReady,
      ceoReadinessReady,
      noSendPreflightAligned,
      audienceScopeAligned,
      priorInputRequestUsable,
      recommendedDecisionKind: 'pilot_distribution_strategy_choice_no_send',
      canAskPilotLaneDecisionNow: decisionPacketReady,
      asksPublicSendApprovalNow: false,
      canAskFinalSendApprovalNow: false,
      exactApprovalPhraseAvailable: false,
      exactApprovalPhrasePrinted: false,
      canExecuteNow: false,
      liveActionAllowedNow: false,
      wouldAuthorizeSend: false,
      wouldAuthorizeAudienceAssignment: false,
      wouldAuthorizeSubscriberMutation: false,
      wouldAuthorizeShopifyMutation: false,
      wouldAuthorizeCrmWrite: false,
      currentDefault: 'keep_null_audience_no_public_send',
      currentDefaultKnownActiveCount: nullAudienceOption?.knownActiveCount ?? 0,
      recommendedDecisionOptions: decisionOptions
        .filter((option) => option.id !== 'broad_existing_active_subscribers_future_only')
        .map((option) => option.id),
      nextLearningLanes: ['manual_micro_cohort_next', 'opt_in_testers_next'],
      broadActiveSubscriberSendRecommendedNow: false,
      existingActiveSubscriberAudienceFutureOnly: true,
      existingActiveSubscriberAudienceKnownActiveCount: existingAudienceOption?.knownActiveCount ?? null,
      blockerCount: blockers.length,
      blockers,
      nextSafeAction: decisionPacketReady
        ? 'Ask Alejandro for one strategy-only no-send lane choice; then prepare only the matching local roster/preflight packet.'
        : 'Resolve local evidence blockers before asking for a pilot distribution lane choice.',
    },
    ceoEvidence: {
      ceoProposalStatus: ceoProposalPacket?.status ?? null,
      ceoReviewDeltaStatus: ceoReviewReadinessDelta?.status ?? null,
      compactSeedExecutionComplete: ceoSummary.compactSeedExecutionComplete ?? null,
      compactFooterSeedInboxArtifactQaReady: deltaSummary.compactFooterSeedInboxArtifactQaReady ?? null,
      compactFooterVisualReadbackGreen: deltaSummary.compactFooterVisualReadbackGreen ?? null,
      readyForPublicSendApprovalNow: deltaSummary.readyForPublicSendApprovalNow ?? null,
      liveActionAllowedNow: deltaSummary.liveActionAllowedNow ?? null,
    },
    decisionOptions,
    requestedHumanText: {
      purpose: 'strategy_choice_only_no_send',
      safeQuestion:
        'Elige solo la estrategia no-send: keep_null_audience_no_public_send, manual_micro_cohort_next u opt_in_testers_next. Esta decision no aprueba envio ni asignacion de audiencia.',
      notApprovalFor: [
        'MailerLite send',
        'public/audience send',
        'audience assignment',
        'subscriber/group/segment mutation',
        'workflow or automation change',
        'Shopify live publish or navigation',
        'CRM write',
        'Signal Ledger append',
        'card or scoring write',
        'Fact Store write',
      ],
    },
    blockedLiveBoundaries: [
      'resend_any_compact_footer_seed_test',
      'public_or_audience_send',
      'MailerLite publish_or_schedule',
      'audience_assignment',
      'subscriber_group_segment_workflow_mutation',
      'Shopify_publish_or_live_form_wiring',
      'CRM_live_writes',
      'Signal_Ledger_cards_scoring_Fact_Store',
    ],
    sourceDigests,
    safety,
  };
};

const loadPacketFromFiles = async (options) => {
  const sources = await Promise.all([
    readJsonWithDigest(options.ceoProposalPacket, 'compact-footer v2 CEO proposal readiness evidence'),
    readJsonWithDigest(options.ceoReviewReadinessDelta, 'compact-footer v2 CEO review readiness delta'),
    readJsonWithDigest(options.publicSendPreflightDecisionPacket, 'no-send public preflight posture'),
    readJsonWithDigest(options.publicAudienceScopePacket, 'Null Audience default and pilot audience options'),
    readOptionalJsonWithDigest(options.pilotDistributionInputRequestPacket, 'prior pilot distribution input request posture'),
  ]);

  return buildPilotDistributionDecisionPacket({
    ceoProposalPacket: sources[0].value,
    ceoReviewReadinessDelta: sources[1].value,
    publicSendPreflightDecisionPacket: sources[2].value,
    publicAudienceScopePacket: sources[3].value,
    pilotDistributionInputRequestPacket: sources[4].value,
    sourceDigests: sources.map((source) => source.digest),
  });
};

const renderList = (items = []) => items.length ? items.map((item) => `- ${item}`).join('\n') : '- none';

const renderMarkdown = (report) => [
  '# MailerLite Mini-Launch Pilot Distribution Decision Packet No-Send',
  '',
  `Generated: ${report.generatedAt}`,
  `Status: ${report.status}`,
  `Launch: ${report.launch.resourceName}`,
  '',
  '## Executive Summary',
  '',
  `- Decision packet ready: ${report.executiveSummary.decisionPacketReady}`,
  `- CEO packet ready: ${report.executiveSummary.ceoPacketReady}`,
  `- CEO readiness ready: ${report.executiveSummary.ceoReadinessReady}`,
  `- No-send preflight aligned: ${report.executiveSummary.noSendPreflightAligned}`,
  `- Audience scope aligned: ${report.executiveSummary.audienceScopeAligned}`,
  `- Can ask pilot lane decision now: ${report.executiveSummary.canAskPilotLaneDecisionNow}`,
  `- Asks public send approval now: ${report.executiveSummary.asksPublicSendApprovalNow}`,
  `- Can ask final send approval now: ${report.executiveSummary.canAskFinalSendApprovalNow}`,
  `- Exact approval phrase available: ${report.executiveSummary.exactApprovalPhraseAvailable}`,
  `- Live action allowed now: ${report.executiveSummary.liveActionAllowedNow}`,
  `- Would authorize send: ${report.executiveSummary.wouldAuthorizeSend}`,
  `- Would authorize audience assignment: ${report.executiveSummary.wouldAuthorizeAudienceAssignment}`,
  `- Current default: ${report.executiveSummary.currentDefault}`,
  `- Current default known active count: ${report.executiveSummary.currentDefaultKnownActiveCount}`,
  `- Recommended decision kind: ${report.executiveSummary.recommendedDecisionKind}`,
  `- Recommended decision options: ${report.executiveSummary.recommendedDecisionOptions.join(', ')}`,
  `- Next learning lanes: ${report.executiveSummary.nextLearningLanes.join(', ')}`,
  `- Broad active subscriber send recommended now: ${report.executiveSummary.broadActiveSubscriberSendRecommendedNow}`,
  `- Existing active subscriber audience future only: ${report.executiveSummary.existingActiveSubscriberAudienceFutureOnly}`,
  `- Existing active subscriber audience known active count: ${report.executiveSummary.existingActiveSubscriberAudienceKnownActiveCount}`,
  `- Blocker count: ${report.executiveSummary.blockerCount}`,
  `- Next safe action: ${report.executiveSummary.nextSafeAction}`,
  '',
  '## CEO Evidence',
  '',
  `- CEO proposal status: ${report.ceoEvidence.ceoProposalStatus}`,
  `- CEO review delta status: ${report.ceoEvidence.ceoReviewDeltaStatus}`,
  `- Compact seed execution complete: ${report.ceoEvidence.compactSeedExecutionComplete}`,
  `- Compact footer seed inbox artifact QA ready: ${report.ceoEvidence.compactFooterSeedInboxArtifactQaReady}`,
  `- Compact footer visual readback green: ${report.ceoEvidence.compactFooterVisualReadbackGreen}`,
  `- Ready for public send approval now: ${report.ceoEvidence.readyForPublicSendApprovalNow}`,
  `- Live action allowed now: ${report.ceoEvidence.liveActionAllowedNow}`,
  '',
  '## Decision Options',
  '',
  renderList(report.decisionOptions.map((option) =>
    `${option.id}: ${option.posture}; recommendedNow=${option.recommendedNow}; wouldAuthorizeSend=${option.wouldAuthorizeSend}; blockers=${option.blockers.join('|') || 'none'}`
  )),
  '',
  '## Safe Human Text',
  '',
  report.requestedHumanText.safeQuestion,
  '',
  '## Not Approval For',
  '',
  renderList(report.requestedHumanText.notApprovalFor),
  '',
  '## Blocked Live Boundaries',
  '',
  renderList(report.blockedLiveBoundaries),
  '',
  '## Safety',
  '',
  `- Local only: ${report.safety.localOnly}`,
  `- Reports only: ${report.safety.reportsOnly}`,
  `- Exact approval phrase available: ${report.safety.exactApprovalPhraseAvailable}`,
  `- Exact approval phrase printed: ${report.safety.exactApprovalPhrasePrinted}`,
  `- MailerLite API called: ${report.safety.mailerLiteApiCalled}`,
  `- MailerLite UI used: ${report.safety.mailerLiteUiUsed}`,
  `- Shopify API called: ${report.safety.shopifyApiCalled}`,
  `- CRM live API called: ${report.safety.crmLiveApiCalled}`,
  `- Subscribers read: ${report.safety.subscribersRead}`,
  `- Subscriber mutations performed: ${report.safety.subscriberMutationsPerformed}`,
  `- Group mutations performed: ${report.safety.groupMutationsPerformed}`,
  `- Sends performed: ${report.safety.sendsPerformed}`,
  `- Audience assignment performed: ${report.safety.audienceAssignmentPerformed}`,
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
  if (!safetyClosed(report.safety)) throw new Error('safety_not_closed');

  const out = await writeText(options.out, `${JSON.stringify(report, null, 2)}\n`);
  const markdownOut = await writeText(options.markdownOut, renderMarkdown(report));

  console.log(JSON.stringify({
    ok: report.ok,
    status: report.status,
    generatedAt: report.generatedAt,
    decisionPacketReady: report.executiveSummary.decisionPacketReady,
    canAskPilotLaneDecisionNow: report.executiveSummary.canAskPilotLaneDecisionNow,
    asksPublicSendApprovalNow: report.executiveSummary.asksPublicSendApprovalNow,
    canAskFinalSendApprovalNow: report.executiveSummary.canAskFinalSendApprovalNow,
    exactApprovalPhraseAvailable: report.executiveSummary.exactApprovalPhraseAvailable,
    liveActionAllowedNow: report.executiveSummary.liveActionAllowedNow,
    recommendedDecisionKind: report.executiveSummary.recommendedDecisionKind,
    recommendedDecisionOptions: report.executiveSummary.recommendedDecisionOptions,
    blockerCount: report.executiveSummary.blockerCount,
    out,
    markdownOut,
    safety: report.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite mini-launch pilot distribution decision packet failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildPilotDistributionDecisionPacket,
  buildSafety,
  parseArgs,
  renderMarkdown,
  safetyClosed,
};
