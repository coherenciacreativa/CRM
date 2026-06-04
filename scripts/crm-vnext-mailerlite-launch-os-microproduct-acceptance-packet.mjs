#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-launch-os-microproduct-acceptance-packet-2026-06-04';
const DEFAULT_REPORTS_DIR = '/Users/alejandrogomez/Documents/Mantis-Reports';
const DEFAULT_CEO_PROPOSAL_PACKET =
  `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_ceo_proposal_packet_post_seed_test_current_inteligencia_descansar_2026-06-03.json`;
const DEFAULT_CEO_REVIEW_READINESS_DELTA =
  `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_ceo_review_readiness_delta_post_seed_test_current_inteligencia_descansar_2026-06-03.json`;
const DEFAULT_PILOT_DISTRIBUTION_DECISION_INTAKE =
  `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_pilot_distribution_decision_intake_post_seed_test_current_inteligencia_descansar_2026-06-03.json`;
const DEFAULT_LEARNING_DIGEST =
  `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_launch_rehearsal_learning_digest_post_seed_test_current_inteligencia_descansar_2026-06-03.json`;
const DEFAULT_BASELINE_AUDIT =
  `${DEFAULT_REPORTS_DIR}/mailerlite_launch_os_v0_baseline_operability_gap_audit_after_pilot_inteligencia_descansar_2026-06-03.json`;
const DEFAULT_HARDENING_PLAN =
  `${DEFAULT_REPORTS_DIR}/mailerlite_launch_os_v0_baseline_hardening_plan_after_gap_audit_2026-06-03.json`;
const DEFAULT_TAXONOMY_AUDIT =
  `${DEFAULT_REPORTS_DIR}/mailerlite_launch_os_taxonomy_consolidation_audit_post_local_apply_current_2026-06-03.json`;
const DEFAULT_TAXONOMY_HANDOFF =
  `${DEFAULT_REPORTS_DIR}/mailerlite_launch_os_taxonomy_refresh_handoff_post_local_apply_current_2026-06-03.json`;
const DEFAULT_OUTPUT =
  `${DEFAULT_REPORTS_DIR}/mailerlite_launch_os_v0_microproduct_acceptance_packet_current_2026-06-04.json`;
const DEFAULT_MARKDOWN_OUTPUT =
  `${DEFAULT_REPORTS_DIR}/mailerlite_launch_os_v0_microproduct_acceptance_packet_current_2026-06-04.md`;

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-launch-os-microproduct-acceptance-packet.mjs [options]

Options:
  --ceo-proposal-packet <path>                  CEO proposal packet JSON. Defaults to ${DEFAULT_CEO_PROPOSAL_PACKET}
  --ceo-review-readiness-delta <path>           CEO review readiness delta JSON. Defaults to ${DEFAULT_CEO_REVIEW_READINESS_DELTA}
  --pilot-distribution-decision-intake <path>   Pilot distribution decision intake JSON. Defaults to ${DEFAULT_PILOT_DISTRIBUTION_DECISION_INTAKE}
  --learning-digest <path>                      Launch rehearsal learning digest JSON. Defaults to ${DEFAULT_LEARNING_DIGEST}
  --baseline-audit <path>                       Launch OS baseline operability audit JSON. Defaults to ${DEFAULT_BASELINE_AUDIT}
  --hardening-plan <path>                       Launch OS baseline hardening plan JSON. Defaults to ${DEFAULT_HARDENING_PLAN}
  --taxonomy-audit <path>                       Post-apply taxonomy consolidation audit JSON. Defaults to ${DEFAULT_TAXONOMY_AUDIT}
  --taxonomy-handoff <path>                     Post-apply taxonomy refresh handoff JSON. Defaults to ${DEFAULT_TAXONOMY_HANDOFF}
  --out <path>                                  Write JSON packet. Defaults to ${DEFAULT_OUTPUT}
  --markdown-out <path>                         Write Markdown packet. Defaults to ${DEFAULT_MARKDOWN_OUTPUT}
  --help                                        Show this help

Local-only reusable Launch OS v0 microproduct acceptance packet. It reads
existing local/redacted reports and decides whether a future microproduct is
ready for CEO review or the next gate across Brand, Product Value, Web/Shopify,
MailerLite, CRM and Safety. It never opens UI, calls live APIs, sends emails,
assigns audience, reads subscribers, writes CRM records, appends ledgers, writes
cards/scoring/Fact Store, or treats seed/internal QA as market evidence.`;

const parseArgs = (argv) => {
  const options = {
    ceoProposalPacket: DEFAULT_CEO_PROPOSAL_PACKET,
    ceoReviewReadinessDelta: DEFAULT_CEO_REVIEW_READINESS_DELTA,
    pilotDistributionDecisionIntake: DEFAULT_PILOT_DISTRIBUTION_DECISION_INTAKE,
    learningDigest: DEFAULT_LEARNING_DIGEST,
    baselineAudit: DEFAULT_BASELINE_AUDIT,
    hardeningPlan: DEFAULT_HARDENING_PLAN,
    taxonomyAudit: DEFAULT_TAXONOMY_AUDIT,
    taxonomyHandoff: DEFAULT_TAXONOMY_HANDOFF,
    out: DEFAULT_OUTPUT,
    markdownOut: DEFAULT_MARKDOWN_OUTPUT,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--ceo-proposal-packet') options.ceoProposalPacket = argv[++index];
    else if (arg === '--ceo-review-readiness-delta') options.ceoReviewReadinessDelta = argv[++index];
    else if (arg === '--pilot-distribution-decision-intake') options.pilotDistributionDecisionIntake = argv[++index];
    else if (arg === '--learning-digest') options.learningDigest = argv[++index];
    else if (arg === '--baseline-audit') options.baselineAudit = argv[++index];
    else if (arg === '--hardening-plan') options.hardeningPlan = argv[++index];
    else if (arg === '--taxonomy-audit') options.taxonomyAudit = argv[++index];
    else if (arg === '--taxonomy-handoff') options.taxonomyHandoff = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  return options;
};

const sha256 = (value) => createHash('sha256').update(String(value)).digest('hex');
const asArray = (value) => (Array.isArray(value) ? value : []);
const unique = (items) => [...new Set(asArray(items).filter(Boolean))];

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
  audienceAssignmentPerformed: false,
  sendsPerformed: false,
  campaignsPublished: false,
  campaignsScheduled: false,
  signalLedgerAppendPerformed: false,
  crmCardMutationsPerformed: false,
  crmScoreMutationsPerformed: false,
  factStoreWritePerformed: false,
  observedEventsInvented: false,
  seedOrQaTreatedAsMarketSignal: false,
  rawIdsPrinted: false,
  exactUrlsPrinted: false,
  recipientsPrinted: false,
  tokensPrinted: false,
});

const safetyClosed = (safety) => Object.entries(safety).every(([key, value]) => (
  key === 'localOnly' || key === 'reportsOnly' ? value === true : value === false
));

const gate = ({
  id,
  label,
  trafficLight,
  decisionStatus,
  readyForCeoReview,
  readyForNextLocalGate,
  readyForLive,
  evidence = {},
  blockers = [],
  requestIfBlocked = null,
}) => ({
  id,
  label,
  trafficLight,
  decisionStatus,
  readyForCeoReview,
  readyForNextLocalGate,
  readyForLive,
  evidence,
  blockers: unique(blockers),
  requestIfBlocked,
});

const gateById = (packet, id) => asArray(packet?.gateMatrix).find((entry) => entry?.id === id) ?? {};

const countByTraffic = (gates, trafficLight) =>
  gates.filter((entry) => entry.trafficLight === trafficLight).length;

const buildRequiredGateMarkers = ({ taxonomyLocalConsolidated }) => ({
  taxonomyLocalConsolidated: taxonomyLocalConsolidated ? 'green' : 'blocked',
  crmSignalWriteReadiness: 'deferred_until_real_observed_events',
  publicAudienceSend: 'closed',
  seedTests: 'only_under_standing_delegation_and_green_qa',
  humanProductBlockers:
    'must_become_clear_requests_not_more_infrastructure',
});

const buildAcceptanceGates = ({
  ceoProposalPacket,
  ceoReviewReadinessDelta,
  pilotDistributionDecisionIntake,
  learningDigest,
  baselineAudit,
  hardeningPlan,
  taxonomyAudit,
  taxonomyHandoff,
}) => {
  const proposalSummary = ceoProposalPacket?.executiveSummary ?? {};
  const deltaSummary = ceoReviewReadinessDelta?.executiveSummary ?? {};
  const pilotSummary = pilotDistributionDecisionIntake?.executiveSummary ?? {};
  const learningSummary = learningDigest?.executiveSummary ?? {};
  const baselineSummary = baselineAudit?.executiveSummary ?? {};
  const hardeningSummary = hardeningPlan?.executiveSummary ?? {};
  const taxonomySummary = taxonomyAudit?.executiveSummary ?? {};
  const taxonomyHandoffSummary = taxonomyHandoff?.executiveSummary ?? {};

  const taxonomyLocalConsolidated = taxonomyAudit?.status === 'taxonomy_receipts_consolidated_no_live_changes'
    && taxonomySummary.brandPromotionNeededCount === 0
    && taxonomySummary.crmManifestRefreshNeededCount === 0
    && taxonomySummary.issueCount === 0
    && taxonomySummary.openLiveMutationGateCount === 0
    && taxonomyHandoff?.status === 'taxonomy_refresh_handoff_not_needed_no_live_changes'
    && taxonomyHandoffSummary.openLiveMutationGateCount === 0;

  const productValueGreen = proposalSummary.productValueReady === true;
  const brandIntegratedGreen = proposalSummary.integratedExperienceReady === true
    && gateById(ceoProposalPacket, 'brand_web_integrated_qa')?.ready === true;
  const webShopifyGreen = proposalSummary.webShopifyReady === true
    && gateById(ceoProposalPacket, 'web_shopify_destination_readiness')?.ready === true;
  const mailerLiteGreen = proposalSummary.mailerLiteDeliveryReady === true
    && proposalSummary.compactSeedExecutionComplete === true
    && deltaSummary.compactFooterSeedExecutionComplete === true
    && deltaSummary.compactFooterSeedInboxArtifactQaReady === true
    && deltaSummary.compactFooterVisualReadbackGreen === true;
  const publicAudienceClosed = proposalSummary.publicSendApprovalReady === false
    && proposalSummary.liveActionAllowedNow === false
    && pilotSummary.selectedPilotLane === 'keep_null_audience_no_public_send'
    && pilotSummary.wouldAuthorizeSend === false
    && pilotSummary.wouldAuthorizeAudienceAssignment === false
    && pilotSummary.liveActionAllowedNow === false;
  const safetyGreen = publicAudienceClosed
    && baselineSummary.liveActionAllowedNow === false
    && baselineSummary.publicAudienceSendAuthorized === false
    && learningSummary.liveActionAllowedNow === false
    && learningSummary.publicAudienceSendAuthorized === false;

  return [
    gate({
      id: 'brand',
      label: 'Brand',
      trafficLight: taxonomyLocalConsolidated && brandIntegratedGreen ? 'green' : 'yellow',
      decisionStatus: taxonomyLocalConsolidated && brandIntegratedGreen
        ? 'brand_canon_and_integrated_qa_ready_local_only'
        : 'brand_evidence_needs_refresh_before_reuse',
      readyForCeoReview: taxonomyLocalConsolidated && brandIntegratedGreen,
      readyForNextLocalGate: taxonomyLocalConsolidated,
      readyForLive: false,
      evidence: {
        taxonomyStatus: taxonomyAudit?.status ?? null,
        taxonomyLiveEvidenceGroupCount: taxonomySummary.liveEvidenceGroupCount ?? null,
        brandPromotionNeededCount: taxonomySummary.brandPromotionNeededCount ?? null,
        integratedQaStatus: gateById(ceoProposalPacket, 'brand_web_integrated_qa')?.status ?? null,
      },
      blockers: taxonomyLocalConsolidated && brandIntegratedGreen
        ? []
        : ['brand_or_taxonomy_not_green_for_reuse'],
      requestIfBlocked: 'Refresh Brand/taxonomy evidence locally before using this acceptance model for a new microproduct.',
    }),
    gate({
      id: 'product_value',
      label: 'Product Value',
      trafficLight: productValueGreen ? 'green' : 'yellow',
      decisionStatus: productValueGreen
        ? 'product_value_gate_ready_for_ceo_review'
        : 'product_value_gate_needs_ceo_or_product_input',
      readyForCeoReview: productValueGreen,
      readyForNextLocalGate: productValueGreen,
      readyForLive: false,
      evidence: {
        ceoProposalStatus: ceoProposalPacket?.status ?? null,
        productValueReady: proposalSummary.productValueReady ?? null,
        blockerCount: gateById(ceoProposalPacket, 'product_value_gate')?.evidence?.blockerCount ?? null,
      },
      blockers: productValueGreen ? [] : ['product_value_gate_not_green'],
      requestIfBlocked: 'Ask Alejandro for the missing product/value decision instead of adding infrastructure.',
    }),
    gate({
      id: 'web_shopify',
      label: 'Web/Shopify',
      trafficLight: webShopifyGreen ? 'green' : 'yellow',
      decisionStatus: webShopifyGreen
        ? 'preview_destinations_ready_public_send_closed'
        : 'preview_destination_readiness_needs_local_refresh',
      readyForCeoReview: webShopifyGreen,
      readyForNextLocalGate: webShopifyGreen,
      readyForLive: false,
      evidence: gateById(ceoProposalPacket, 'web_shopify_destination_readiness')?.evidence ?? {},
      blockers: webShopifyGreen ? [] : ['web_shopify_preview_not_green'],
      requestIfBlocked: 'Refresh local asset and preview readiness before any send or CEO launch decision.',
    }),
    gate({
      id: 'mailerlite',
      label: 'MailerLite',
      trafficLight: mailerLiteGreen ? 'green' : 'yellow',
      decisionStatus: mailerLiteGreen
        ? 'null_audience_delivery_rehearsal_seed_tested_no_audience_send'
        : 'delivery_rehearsal_needs_green_seed_or_draft_evidence',
      readyForCeoReview: mailerLiteGreen,
      readyForNextLocalGate: mailerLiteGreen,
      readyForLive: false,
      evidence: {
        ...gateById(ceoProposalPacket, 'mailerlite_delivery_logic')?.evidence,
        seedTestsRule: 'only_under_standing_delegation_and_green_qa',
      },
      blockers: mailerLiteGreen ? [] : ['mailerlite_delivery_rehearsal_not_green'],
      requestIfBlocked: 'Run only delegated seed-test/local QA paths when policy conditions are green; do not request public send approval from this gate.',
    }),
    gate({
      id: 'crm',
      label: 'CRM',
      trafficLight: 'yellow',
      decisionStatus: 'signal_write_readiness_deferred_until_real_observed_events',
      readyForCeoReview: true,
      readyForNextLocalGate: true,
      readyForLive: false,
      evidence: {
        crmSignalDesignStatus: gateById(ceoProposalPacket, 'crm_signal_design')?.status ?? null,
        crmSignalDesignReady: proposalSummary.crmSignalDesignReady ?? null,
        canAppendSignalLedgerNow: false,
        canWriteCardsNow: false,
        canScoreNow: false,
        canWriteFactStoreNow: false,
        observedEventsPolicy: 'real_private_observed_events_required_before_write_readiness',
      },
      blockers: ['missing_real_private_observed_events_for_signal_write_readiness'],
      requestIfBlocked: 'Wait for real observed events with exact people; do not invent events or use seed/internal QA as market signals.',
    }),
    gate({
      id: 'safety',
      label: 'Safety',
      trafficLight: safetyGreen ? 'green' : 'yellow',
      decisionStatus: safetyGreen
        ? 'live_gates_closed_local_only_safe_to_continue'
        : 'safety_gate_requires_refresh_before_continuing',
      readyForCeoReview: safetyGreen,
      readyForNextLocalGate: safetyGreen,
      readyForLive: false,
      evidence: {
        selectedPilotLane: pilotSummary.selectedPilotLane ?? null,
        publicAudienceSendAuthorized: baselineSummary.publicAudienceSendAuthorized ?? null,
        publicSendApprovalReady: proposalSummary.publicSendApprovalReady ?? null,
        liveActionAllowedNow: proposalSummary.liveActionAllowedNow ?? null,
        hardeningRecommendedImmediateTrack: hardeningSummary.recommendedImmediateTrack ?? null,
      },
      blockers: safetyGreen ? [] : ['safety_live_gate_state_not_closed_or_unknown'],
      requestIfBlocked: 'Stop and refresh local safety evidence before any next gate.',
    }),
  ];
};

const buildReusableAcceptanceModel = () => ({
  purpose: 'Evaluate any future Launch OS microproduct before CEO review or a next gate without touching live systems.',
  requiredInputs: [
    'Microproduct idea and market hypothesis.',
    'Product Value Gate packet.',
    'Brand/integrated experience QA evidence.',
    'Web/Shopify preview destination evidence.',
    'MailerLite delivery logic evidence with Null Audience or delegated seed-test posture.',
    'CRM signal design posture, with CRM writes deferred unless real observed events exist.',
    'Safety posture showing public/audience send, workflow, subscriber and CRM write gates closed.',
  ],
  decisionOutputs: [
    'ready_for_ceo_review_local_only',
    'ready_for_next_local_gate',
    'blocked_with_clear_human_product_request',
    'requires_live_approval_boundary',
  ],
  nonNegotiables: [
    'Human/product blockers become clear requests, not more infrastructure.',
    'No seed test, internal QA or Null Audience event becomes a real market signal.',
    'No public/audience send is inferred from a green local packet.',
    'No CRM write readiness is reopened without real private observed events.',
  ],
});

const buildDecisionBoard = ({ gates, ceoProposalPacket, pilotDistributionDecisionIntake }) => {
  const yellowGateIds = gates.filter((entry) => entry.trafficLight === 'yellow').map((entry) => entry.id);
  const redGateIds = gates.filter((entry) => entry.trafficLight === 'red').map((entry) => entry.id);
  const localReady = redGateIds.length === 0
    && gates.every((entry) => entry.readyForNextLocalGate === true);
  const ceoReady = ceoProposalPacket?.executiveSummary?.ceoProposalReviewReady === true
    && ceoProposalPacket?.executiveSummary?.ceoProposalReviewReadyWithSeedCaveat === false;

  return {
    canUseAsReusableAcceptanceChecklistNow: localReady,
    canUseCurrentPilotAsPositiveControl: ceoReady,
    readyForCeoReviewLocalOnly: ceoReady,
    readyForPublicAudienceSendApproval: false,
    readyForCrmSignalWriteApproval: false,
    needsCeoDecisionNow: false,
    recommendedNextLocalOnlyStep: 'Use this acceptance packet as the v0 checklist for the next microproduct candidate before any live approval boundary.',
    nextLiveBoundaryIfStrategyChanges: 'public_or_audience_send_requires_fresh_exact_approval_and_fresh_safety_evidence',
    yellowGateIds,
    redGateIds,
    selectedPilotLane: pilotDistributionDecisionIntake?.executiveSummary?.selectedPilotLane ?? null,
  };
};

const buildMicroproductAcceptancePacket = ({
  ceoProposalPacket,
  ceoReviewReadinessDelta,
  pilotDistributionDecisionIntake,
  learningDigest,
  baselineAudit,
  hardeningPlan,
  taxonomyAudit,
  taxonomyHandoff,
  sourceDigests = [],
  generatedAt = new Date().toISOString(),
}) => {
  const safety = buildSafety();
  const gates = buildAcceptanceGates({
    ceoProposalPacket,
    ceoReviewReadinessDelta,
    pilotDistributionDecisionIntake,
    learningDigest,
    baselineAudit,
    hardeningPlan,
    taxonomyAudit,
    taxonomyHandoff,
  });
  const taxonomyLocalConsolidated = gates.find((entry) => entry.id === 'brand')?.trafficLight === 'green'
    && taxonomyAudit?.status === 'taxonomy_receipts_consolidated_no_live_changes';
  const requiredGateMarkers = buildRequiredGateMarkers({ taxonomyLocalConsolidated });
  const decisionBoard = buildDecisionBoard({ gates, ceoProposalPacket, pilotDistributionDecisionIntake });
  const greenGateCount = countByTraffic(gates, 'green');
  const yellowGateCount = countByTraffic(gates, 'yellow');
  const redGateCount = countByTraffic(gates, 'red');
  const acceptanceReady = decisionBoard.canUseAsReusableAcceptanceChecklistNow
    && safetyClosed(safety)
    && requiredGateMarkers.taxonomyLocalConsolidated === 'green'
    && requiredGateMarkers.crmSignalWriteReadiness === 'deferred_until_real_observed_events'
    && requiredGateMarkers.publicAudienceSend === 'closed';

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_launch_os_v0_microproduct_acceptance_packet',
    generatedAt,
    ok: acceptanceReady,
    status: acceptanceReady
      ? 'microproduct_acceptance_packet_ready_local_only_with_crm_signal_deferred'
      : 'microproduct_acceptance_packet_blocked_local_only',
    executiveSummary: {
      reusableAcceptancePacketReady: acceptanceReady,
      currentPilotAcceptedAsPositiveControl:
        ceoProposalPacket?.executiveSummary?.ceoProposalReviewReady === true,
      readyForCeoReviewLocalOnly: decisionBoard.readyForCeoReviewLocalOnly,
      readyForNextLocalGate: decisionBoard.canUseAsReusableAcceptanceChecklistNow,
      readyForPublicAudienceSendApproval: false,
      readyForCrmSignalWriteApproval: false,
      liveActionAllowedNow: false,
      taxonomyLocalConsolidated: requiredGateMarkers.taxonomyLocalConsolidated,
      crmSignalWriteReadiness: requiredGateMarkers.crmSignalWriteReadiness,
      publicAudienceSend: requiredGateMarkers.publicAudienceSend,
      seedTests: requiredGateMarkers.seedTests,
      humanProductBlockers: requiredGateMarkers.humanProductBlockers,
      greenGateCount,
      yellowGateCount,
      redGateCount,
      nextSafeAction: decisionBoard.recommendedNextLocalOnlyStep,
      noCeoDecisionNeededYet: decisionBoard.needsCeoDecisionNow === false,
    },
    currentPilot: {
      launchId: ceoProposalPacket?.launch?.launchId ?? 'mini_2026_06_rehearsal_inteligencia_para_descansar',
      resourceName: ceoProposalPacket?.launch?.resourceName ?? 'Inteligencia para descansar',
      sourceRole: 'positive_control_for_acceptance_packet_v0',
      selectedPilotLane: decisionBoard.selectedPilotLane,
    },
    requiredGateMarkers,
    gateMatrix: gates,
    decisionBoard,
    reusableAcceptanceModel: buildReusableAcceptanceModel(),
    clearRequestsIfBlocked: gates
      .filter((entry) => entry.blockers.length > 0)
      .map((entry) => ({
        gateId: entry.id,
        trafficLight: entry.trafficLight,
        blockers: entry.blockers,
        request: entry.requestIfBlocked,
      })),
    hardStops: [
      'Do not reopen CRM signal-write readiness until real private observed events exist.',
      'Do not invent observed events, exact people, market signals or evidence.',
      'Do not use seed tests, internal QA or Null Audience activity as real market signal evidence.',
      'Do not call live APIs or open UI from this packet.',
      'Do not send emails, publish, schedule or assign audience.',
      'Do not mutate MailerLite, Shopify, CRM, subscribers, groups, tags, segments, workflows, campaigns or sends.',
      'Do not write ledgers, cards, scoring or Fact Store.',
    ],
    sourceDigests,
    safety,
    safetyClosed: safetyClosed(safety),
  };
};

const renderList = (items = []) => items.length ? items.map((item) => `- ${item}`).join('\n') : '- none';

const renderGateRows = (gates) => gates.map((entry) => [
  `| ${entry.label}`,
  entry.trafficLight,
  entry.decisionStatus,
  entry.readyForCeoReview,
  entry.readyForLive,
  `${entry.blockers.length ? entry.blockers.join(', ') : 'none'} |`,
].join(' | ')).join('\n');

const renderMarkdown = (packet) => [
  '# Launch OS v0 - Microproduct Acceptance Packet',
  '',
  `Generated: ${packet.generatedAt}`,
  `Status: ${packet.status}`,
  '',
  '## Executive Summary',
  '',
  `- Reusable acceptance packet ready: ${packet.executiveSummary.reusableAcceptancePacketReady}`,
  `- Current pilot accepted as positive control: ${packet.executiveSummary.currentPilotAcceptedAsPositiveControl}`,
  `- Ready for CEO review local-only: ${packet.executiveSummary.readyForCeoReviewLocalOnly}`,
  `- Ready for next local gate: ${packet.executiveSummary.readyForNextLocalGate}`,
  `- Ready for public/audience send approval: ${packet.executiveSummary.readyForPublicAudienceSendApproval}`,
  `- Ready for CRM signal-write approval: ${packet.executiveSummary.readyForCrmSignalWriteApproval}`,
  `- Live action allowed now: ${packet.executiveSummary.liveActionAllowedNow}`,
  `- Green gates: ${packet.executiveSummary.greenGateCount}`,
  `- Yellow gates: ${packet.executiveSummary.yellowGateCount}`,
  `- Red gates: ${packet.executiveSummary.redGateCount}`,
  `- Next safe action: ${packet.executiveSummary.nextSafeAction}`,
  '',
  '## Required Markers',
  '',
  `- taxonomy local consolidated = ${packet.requiredGateMarkers.taxonomyLocalConsolidated}`,
  `- CRM signal-write readiness = ${packet.requiredGateMarkers.crmSignalWriteReadiness}`,
  `- public/audience send = ${packet.requiredGateMarkers.publicAudienceSend}`,
  `- seed tests = ${packet.requiredGateMarkers.seedTests}`,
  `- human/product blockers = ${packet.requiredGateMarkers.humanProductBlockers}`,
  '',
  '## Gate Matrix',
  '',
  '| Gate | Light | Decision status | CEO review | Live ready | Blockers |',
  '|---|---|---|---:|---:|---|',
  renderGateRows(packet.gateMatrix),
  '',
  '## Decision Board',
  '',
  `- Can use as reusable acceptance checklist now: ${packet.decisionBoard.canUseAsReusableAcceptanceChecklistNow}`,
  `- Can use current pilot as positive control: ${packet.decisionBoard.canUseCurrentPilotAsPositiveControl}`,
  `- Needs CEO decision now: ${packet.decisionBoard.needsCeoDecisionNow}`,
  `- Recommended next local-only step: ${packet.decisionBoard.recommendedNextLocalOnlyStep}`,
  `- Next live boundary if strategy changes: ${packet.decisionBoard.nextLiveBoundaryIfStrategyChanges}`,
  '',
  '## Reusable Acceptance Model',
  '',
  `- Purpose: ${packet.reusableAcceptanceModel.purpose}`,
  '',
  'Required inputs:',
  renderList(packet.reusableAcceptanceModel.requiredInputs),
  '',
  'Decision outputs:',
  renderList(packet.reusableAcceptanceModel.decisionOutputs),
  '',
  'Non-negotiables:',
  renderList(packet.reusableAcceptanceModel.nonNegotiables),
  '',
  '## Clear Requests If Blocked',
  '',
  packet.clearRequestsIfBlocked.length
    ? packet.clearRequestsIfBlocked
      .map((item) => `- ${item.gateId}: ${item.request}`)
      .join('\n')
    : '- none',
  '',
  '## Safety',
  '',
  `- Local only: ${packet.safety.localOnly}`,
  `- Reports only: ${packet.safety.reportsOnly}`,
  `- MailerLite API called: ${packet.safety.mailerLiteApiCalled}`,
  `- Shopify API called: ${packet.safety.shopifyApiCalled}`,
  `- CRM live API called: ${packet.safety.crmLiveApiCalled}`,
  `- Sends performed: ${packet.safety.sendsPerformed}`,
  `- Audience assignment performed: ${packet.safety.audienceAssignmentPerformed}`,
  `- CRM writes performed: ${packet.safety.crmCardMutationsPerformed}`,
  `- Ledgers/cards/scoring/Fact Store touched: ${packet.safety.signalLedgerAppendPerformed || packet.safety.crmCardMutationsPerformed || packet.safety.crmScoreMutationsPerformed || packet.safety.factStoreWritePerformed}`,
  `- Observed events invented: ${packet.safety.observedEventsInvented}`,
  `- Seed or QA treated as market signal: ${packet.safety.seedOrQaTreatedAsMarketSignal}`,
  '',
  '## Hard Stops',
  '',
  renderList(packet.hardStops),
  '',
].join('\n');

const writeText = async (path, content) => {
  const resolved = resolve(path);
  await mkdir(dirname(resolved), { recursive: true });
  await writeFile(resolved, content, 'utf8');
  return resolved;
};

const buildMicroproductAcceptancePacketFromFiles = async (options) => {
  const [
    ceoProposalPacket,
    ceoReviewReadinessDelta,
    pilotDistributionDecisionIntake,
    learningDigest,
    baselineAudit,
    hardeningPlan,
    taxonomyAudit,
    taxonomyHandoff,
  ] = await Promise.all([
    readJsonWithDigest(options.ceoProposalPacket, 'CEO proposal packet and gate matrix for the current positive-control pilot'),
    readJsonWithDigest(options.ceoReviewReadinessDelta, 'seed-tested CEO readiness delta for MailerLite delivery posture'),
    readJsonWithDigest(options.pilotDistributionDecisionIntake, 'no-send pilot lane decision and public/audience gate posture'),
    readJsonWithDigest(options.learningDigest, 'Launch rehearsal learning digest and proven native lanes'),
    readJsonWithDigest(options.baselineAudit, 'Launch OS v0 baseline operability audit'),
    readJsonWithDigest(options.hardeningPlan, 'Launch OS v0 local hardening plan'),
    readJsonWithDigest(options.taxonomyAudit, 'post-apply local taxonomy consolidation audit'),
    readJsonWithDigest(options.taxonomyHandoff, 'post-apply taxonomy refresh handoff status'),
  ]);

  return buildMicroproductAcceptancePacket({
    ceoProposalPacket: ceoProposalPacket.value,
    ceoReviewReadinessDelta: ceoReviewReadinessDelta.value,
    pilotDistributionDecisionIntake: pilotDistributionDecisionIntake.value,
    learningDigest: learningDigest.value,
    baselineAudit: baselineAudit.value,
    hardeningPlan: hardeningPlan.value,
    taxonomyAudit: taxonomyAudit.value,
    taxonomyHandoff: taxonomyHandoff.value,
    sourceDigests: [
      ceoProposalPacket.digest,
      ceoReviewReadinessDelta.digest,
      pilotDistributionDecisionIntake.digest,
      learningDigest.digest,
      baselineAudit.digest,
      hardeningPlan.digest,
      taxonomyAudit.digest,
      taxonomyHandoff.digest,
    ],
  });
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const packet = await buildMicroproductAcceptancePacketFromFiles(options);
  const out = await writeText(options.out, `${JSON.stringify(packet, null, 2)}\n`);
  const markdownOut = await writeText(options.markdownOut, renderMarkdown(packet));

  console.log(JSON.stringify({
    ok: packet.ok,
    status: packet.status,
    generatedAt: packet.generatedAt,
    reusableAcceptancePacketReady: packet.executiveSummary.reusableAcceptancePacketReady,
    readyForCeoReviewLocalOnly: packet.executiveSummary.readyForCeoReviewLocalOnly,
    readyForNextLocalGate: packet.executiveSummary.readyForNextLocalGate,
    readyForPublicAudienceSendApproval: packet.executiveSummary.readyForPublicAudienceSendApproval,
    readyForCrmSignalWriteApproval: packet.executiveSummary.readyForCrmSignalWriteApproval,
    taxonomyLocalConsolidated: packet.executiveSummary.taxonomyLocalConsolidated,
    crmSignalWriteReadiness: packet.executiveSummary.crmSignalWriteReadiness,
    publicAudienceSend: packet.executiveSummary.publicAudienceSend,
    greenGateCount: packet.executiveSummary.greenGateCount,
    yellowGateCount: packet.executiveSummary.yellowGateCount,
    redGateCount: packet.executiveSummary.redGateCount,
    noCeoDecisionNeededYet: packet.executiveSummary.noCeoDecisionNeededYet,
    out,
    markdownOut,
    safety: packet.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite Launch OS microproduct acceptance packet failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildMicroproductAcceptancePacket,
  buildMicroproductAcceptancePacketFromFiles,
  parseArgs,
  renderMarkdown,
  safetyClosed,
};
