#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-ceo-proposal-packet-2026-06-02';
const DEFAULT_REPORTS_DIR = '/Users/alejandrogomez/Documents/Mantis-Reports';
const DEFAULT_ASSET_MANIFEST =
  `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_asset_manifest_current_inteligencia_descansar_2026-06-02.json`;
const DEFAULT_PRODUCT_VALUE_REVIEW_PACKET =
  `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_product_value_review_packet_current_inteligencia_descansar_2026-06-02.json`;
const DEFAULT_INTEGRATED_EXPERIENCE_QA_PACKET =
  `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_integrated_experience_qa_packet_current_inteligencia_descansar_2026-06-02.json`;
const DEFAULT_CRM_SIGNAL_PROJECTION_PACKET =
  `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_crm_signal_projection_packet_current_inteligencia_descansar_2026-06-02.json`;
const DEFAULT_PILOT_DISTRIBUTION_STRATEGY_PACKET =
  `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_pilot_distribution_strategy_packet_current_inteligencia_descansar_2026-06-02.json`;
const DEFAULT_CEO_REVIEW_READINESS_DELTA =
  `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_ceo_review_readiness_delta_current_inteligencia_descansar_2026-06-02.json`;
const DEFAULT_PUBLIC_LAUNCH_READINESS_PACKET =
  `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_public_launch_readiness_packet_current_inteligencia_descansar_2026-06-02.json`;
const DEFAULT_OUTPUT =
  `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_ceo_proposal_packet_current_inteligencia_descansar_2026-06-02.json`;
const DEFAULT_MARKDOWN_OUTPUT =
  `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_ceo_proposal_packet_current_inteligencia_descansar_2026-06-02.md`;

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-ceo-proposal-packet.mjs [options]

Options:
  --asset-manifest <path>                    Asset manifest JSON. Defaults to ${DEFAULT_ASSET_MANIFEST}
  --product-value-review-packet <path>       Product/Value review JSON. Defaults to ${DEFAULT_PRODUCT_VALUE_REVIEW_PACKET}
  --integrated-experience-qa-packet <path>   Integrated experience QA JSON. Defaults to ${DEFAULT_INTEGRATED_EXPERIENCE_QA_PACKET}
  --crm-signal-projection-packet <path>      CRM signal projection JSON. Defaults to ${DEFAULT_CRM_SIGNAL_PROJECTION_PACKET}
  --pilot-distribution-strategy-packet <path> Pilot distribution strategy JSON. Defaults to ${DEFAULT_PILOT_DISTRIBUTION_STRATEGY_PACKET}
  --ceo-review-readiness-delta <path>        CEO-review readiness delta JSON. Defaults to ${DEFAULT_CEO_REVIEW_READINESS_DELTA}
  --public-launch-readiness-packet <path>    Public launch readiness JSON. Defaults to ${DEFAULT_PUBLIC_LAUNCH_READINESS_PACKET}
  --out <path>                               Write JSON report. Defaults to ${DEFAULT_OUTPUT}
  --markdown-out <path>                      Write Markdown report. Defaults to ${DEFAULT_MARKDOWN_OUTPUT}
  --help                                     Show this help

Local-only CEO Proposal Packet for a Launch OS mini-product pilot. It prepares
the CEO-review decision artifact from existing no-live evidence: idea,
hypothesis, community-signal posture, value promise, Product Value Gate, assets,
funnel, Brand/Web/MailerLite/CRM QA, learning criteria and next boundary. It
does not open UI, call MailerLite/Shopify/CRM APIs, read subscribers, mutate
groups/workflows/campaigns, send emails, publish pages, append ledgers, write
cards/scoring/Fact Store, or print exact URLs/tokens/recipients.`;

const parseArgs = (argv) => {
  const options = {
    assetManifest: DEFAULT_ASSET_MANIFEST,
    productValueReviewPacket: DEFAULT_PRODUCT_VALUE_REVIEW_PACKET,
    integratedExperienceQaPacket: DEFAULT_INTEGRATED_EXPERIENCE_QA_PACKET,
    crmSignalProjectionPacket: DEFAULT_CRM_SIGNAL_PROJECTION_PACKET,
    pilotDistributionStrategyPacket: DEFAULT_PILOT_DISTRIBUTION_STRATEGY_PACKET,
    ceoReviewReadinessDelta: DEFAULT_CEO_REVIEW_READINESS_DELTA,
    publicLaunchReadinessPacket: DEFAULT_PUBLIC_LAUNCH_READINESS_PACKET,
    out: DEFAULT_OUTPUT,
    markdownOut: DEFAULT_MARKDOWN_OUTPUT,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--asset-manifest') options.assetManifest = argv[++index];
    else if (arg === '--product-value-review-packet') options.productValueReviewPacket = argv[++index];
    else if (arg === '--integrated-experience-qa-packet') options.integratedExperienceQaPacket = argv[++index];
    else if (arg === '--crm-signal-projection-packet') options.crmSignalProjectionPacket = argv[++index];
    else if (arg === '--pilot-distribution-strategy-packet') options.pilotDistributionStrategyPacket = argv[++index];
    else if (arg === '--ceo-review-readiness-delta') options.ceoReviewReadinessDelta = argv[++index];
    else if (arg === '--public-launch-readiness-packet') options.publicLaunchReadinessPacket = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  return options;
};

const sha256 = (value) => createHash('sha256').update(String(value)).digest('hex');
const unique = (items) => [...new Set((items ?? []).filter(Boolean))];

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

const gate = ({ id, ready, status, evidence = {}, blockers = [] }) => ({
  id,
  ready,
  status,
  evidence,
  blockers: blockers.filter(Boolean),
});

const launchFrom = (assetManifest) => ({
  launchId: assetManifest?.launch?.launchId ?? 'mini_2026_06_rehearsal_inteligencia_para_descansar',
  resourceName: assetManifest?.launch?.resourceName ?? 'Inteligencia para descansar',
  resourceType: assetManifest?.launch?.resourceType ?? 'quiz',
});

const buildMicroproductBrief = (launch) => ({
  idea: 'Un quiz/recurso breve que ayuda a una persona a reconocer que tipo de descanso esta pidiendo su mente y a probar una practica pequena sin convertir el descanso en otra tarea.',
  marketHypothesis: 'La comunidad puede responder mejor a un encuadre de descanso con criterio, permiso y pequena accion que a una promesa generica de calma o bienestar perfecto.',
  audienceSignalPosture: 'hypothesis_and_local_copy_signal_ready_real_community_signal_pending',
  audienceSignal: 'El Product Value Gate detecta pain fit, accionabilidad, profundidad de voz y valor CRM en la experiencia local; los eventos observados reales siguen pendientes hasta un piloto aprobado.',
  valuePromise: 'Entregar una lectura y practicas pequenas para mirar el cansancio con mas honestidad, sin diagnostico, cura ni presion de rendimiento.',
  preferredFormat: launch.resourceType,
});

const learningCriteria = (crmSignalProjectionPacket, pilotDistributionStrategyPacket) => {
  const projectionModel = crmSignalProjectionPacket?.projectionModel ?? {};
  const projected = projectionModel.currentProjectionReadyFor ?? [];
  const storeOnly = projectionModel.storeOnlyNow ?? [];
  const lanes = pilotDistributionStrategyPacket?.executiveSummary?.nextLearningLanes ?? [];
  return {
    learningQuestion: 'Que senales muestran si este encuadre de descanso genera reconocimiento, clicks utiles, respuesta cualitativa o deseo de profundizar sin forzar onboarding ni venta?',
    successSignals: [
      'Replies cualitativas con lenguaje de reconocimiento o matiz.',
      'Clicks en lectura, practica o nota editorial sin URLs visibles en el cuerpo.',
      'E04 responses that clarify what to deepen next.',
      'Clean CRM events that stay store-only or projectable only under reviewed policy.',
    ],
    killOrIterateSignals: [
      'Confusion with therapy/diagnosis/cure promise.',
      'Low qualitative recognition despite delivery integrity.',
      'Unsubscribe or complaint pattern in a small approved cohort.',
      'Signals too noisy to justify broader distribution.',
    ],
    crmCurrentProjectionReadyFor: projected,
    crmStoreOnlyNow: storeOnly,
    recommendedNextLearningLanes: lanes,
  };
};

const buildCeoProposalPacket = ({
  assetManifest,
  productValueReviewPacket,
  integratedExperienceQaPacket,
  crmSignalProjectionPacket,
  pilotDistributionStrategyPacket,
  ceoReviewReadinessDelta,
  publicLaunchReadinessPacket,
  generatedAt = new Date().toISOString(),
}) => {
  const safety = buildSafety();
  const launch = launchFrom(assetManifest);
  const productSummary = productValueReviewPacket?.executiveSummary ?? {};
  const integratedSummary = integratedExperienceQaPacket?.executiveSummary ?? {};
  const assetSummary = assetManifest?.executiveSummary ?? {};
  const crmProjectionReady = crmSignalProjectionPacket?.status === 'ready_for_no_live_signal_projection_design'
    && crmSignalProjectionPacket?.approvalGate?.canAppendSignalLedgerNow === false
    && crmSignalProjectionPacket?.approvalGate?.canWriteCardsNow === false
    && crmSignalProjectionPacket?.approvalGate?.canScoreNow === false
    && crmSignalProjectionPacket?.approvalGate?.canWriteFactStoreNow === false;
  const pilotSummary = pilotDistributionStrategyPacket?.executiveSummary ?? {};
  const deltaSummary = ceoReviewReadinessDelta?.executiveSummary ?? {};
  const publicSummary = publicLaunchReadinessPacket?.executiveSummary ?? {};

  const productValueReady = productSummary.productValueReviewPassed === true
    && productSummary.ceoReviewValueReady === true
    && (productSummary.blockerCount ?? 0) === 0;
  const integratedReady = integratedSummary.ceoReviewReady === true
    && integratedSummary.integratedExperienceReady === true
    && (integratedSummary.blockerCount ?? 0) === 0;
  const webReady = assetSummary.finalPublicLinksReady === true
    && assetSummary.publicAudienceSendUrlGateReady === false
    && assetSummary.localAssetSlotReadyCount >= 3
    && assetSummary.previewUrlReadyCount >= 3;
  const compactFooterSeedInboxArtifactQaReady =
    deltaSummary.compactFooterSeedInboxArtifactQaReady !== false;
  const compactFooterVisualReadbackGreen =
    deltaSummary.compactFooterVisualReadbackGreen !== false;
  const mailerLiteDeliveryReady = deltaSummary.compactFooterDraftsReady === true
    && deltaSummary.compactFooterSeedPreflightGreen === true
    && compactFooterSeedInboxArtifactQaReady
    && compactFooterVisualReadbackGreen;
  const compactSeedExecutionComplete = deltaSummary.compactFooterSeedExecutionComplete === true;
  const publicSendClosed = publicSummary.readyForExactPublicSendApproval === false
    && publicSummary.liveActionAllowedNow === false
    && deltaSummary.liveActionAllowedNow === false;
  const proposalReviewReady = productValueReady
    && integratedReady
    && webReady
    && crmProjectionReady
    && mailerLiteDeliveryReady
    && publicSendClosed;

  const gateMatrix = [
    gate({
      id: 'idea_and_hypothesis',
      ready: true,
      status: 'ready_for_ceo_review',
      evidence: {
        resourceName: launch.resourceName,
        resourceType: launch.resourceType,
      },
    }),
    gate({
      id: 'product_value_gate',
      ready: productValueReady,
      status: productValueReady ? 'green' : 'blocked',
      evidence: {
        status: productValueReviewPacket?.status ?? null,
        readyGateCount: productSummary.readyGateCount ?? null,
        blockerCount: productSummary.blockerCount ?? null,
        clickthroughVerified: productSummary.clickthroughVerified ?? null,
      },
      blockers: productSummary.blockers ?? ['product_value_gate_not_green'],
    }),
    gate({
      id: 'brand_web_integrated_qa',
      ready: integratedReady,
      status: integratedReady ? 'green' : 'blocked',
      evidence: {
        status: integratedExperienceQaPacket?.status ?? null,
        integratedExperienceReady: integratedSummary.integratedExperienceReady ?? null,
        blockerCount: integratedSummary.blockerCount ?? null,
        canAskPublicSendApprovalNow: integratedSummary.canAskPublicSendApprovalNow ?? null,
      },
      blockers: integratedSummary.blockers ?? ['integrated_experience_not_green'],
    }),
    gate({
      id: 'web_shopify_destination_readiness',
      ready: webReady,
      status: webReady ? 'preview_ready_public_send_closed' : 'blocked',
      evidence: {
        status: assetManifest?.status ?? null,
        finalPublicLinksReady: assetSummary.finalPublicLinksReady ?? null,
        localAssetSlotReadyCount: assetSummary.localAssetSlotReadyCount ?? null,
        previewUrlReadyCount: assetSummary.previewUrlReadyCount ?? null,
        publicAudienceSendUrlGateReady: assetSummary.publicAudienceSendUrlGateReady ?? null,
      },
      blockers: webReady ? [] : ['web_or_shopify_preview_destinations_not_ready'],
    }),
    gate({
      id: 'mailerlite_delivery_logic',
      ready: mailerLiteDeliveryReady,
      status: mailerLiteDeliveryReady
        ? compactSeedExecutionComplete
          ? 'drafts_and_seed_execution_complete'
          : 'drafts_and_preflight_green_seed_execution_partial'
        : 'blocked',
      evidence: {
        compactFooterDraftsReady: deltaSummary.compactFooterDraftsReady ?? null,
        compactFooterSeedPreflightGreen: deltaSummary.compactFooterSeedPreflightGreen ?? null,
        compactFooterSeedExecutionState: deltaSummary.compactFooterSeedExecutionState ?? null,
        compactFooterSeedInboxArtifactQaReady:
          deltaSummary.compactFooterSeedInboxArtifactQaReady ?? null,
        compactFooterVisualReadbackGreen:
          deltaSummary.compactFooterVisualReadbackGreen ?? null,
        visualSignatureAssetVerified: deltaSummary.visualSignatureAssetVerified ?? null,
        visualSignatureRenderedCount: deltaSummary.visualSignatureRenderedCount ?? null,
        footerNameCompactCount: deltaSummary.footerNameCompactCount ?? null,
        duplicatePostalAddressVisibleCount: deltaSummary.duplicatePostalAddressVisibleCount ?? null,
        duplicateTypedAlejandroAfterClosingCount:
          deltaSummary.duplicateTypedAlejandroAfterClosingCount ?? null,
        sentLabels: deltaSummary.sentLabels ?? [],
        unsentLabels: deltaSummary.unsentLabels ?? [],
        doNotResendLabels: deltaSummary.doNotResendLabels ?? [],
      },
      blockers: compactSeedExecutionComplete
        ? [
          compactFooterSeedInboxArtifactQaReady ? null : 'compact_footer_seed_inbox_artifact_qa_not_green',
          compactFooterVisualReadbackGreen ? null : 'compact_footer_visual_readback_not_green',
        ].filter(Boolean)
        : [
          'compact_footer_seed_execution_partial_e02_e03_e04_unsent',
          compactFooterSeedInboxArtifactQaReady ? null : 'compact_footer_seed_inbox_artifact_qa_not_green',
          compactFooterVisualReadbackGreen ? null : 'compact_footer_visual_readback_not_green',
        ].filter(Boolean),
    }),
    gate({
      id: 'crm_signal_design',
      ready: crmProjectionReady,
      status: crmProjectionReady ? 'ready_no_live_writes' : 'blocked',
      evidence: {
        status: crmSignalProjectionPacket?.status ?? null,
        currentProjectionReadyFor: crmSignalProjectionPacket?.projectionModel?.currentProjectionReadyFor ?? [],
        storeOnlyNow: crmSignalProjectionPacket?.projectionModel?.storeOnlyNow ?? [],
        canAppendSignalLedgerNow: crmSignalProjectionPacket?.approvalGate?.canAppendSignalLedgerNow ?? null,
        canWriteCardsNow: crmSignalProjectionPacket?.approvalGate?.canWriteCardsNow ?? null,
      },
      blockers: crmProjectionReady ? [] : ['crm_signal_projection_not_ready'],
    }),
    gate({
      id: 'distribution_and_live_gate',
      ready: publicSendClosed,
      status: 'closed_not_authorized',
      evidence: {
        publicLaunchReadinessStatus: publicLaunchReadinessPacket?.status ?? null,
        readyForExactPublicSendApproval: publicSummary.readyForExactPublicSendApproval ?? null,
        recommendedStrategyId: pilotSummary.recommendedStrategyId ?? null,
        canAskFinalSendApprovalNow: pilotSummary.canAskFinalSendApprovalNow ?? null,
        liveActionAllowedNow: pilotSummary.liveActionAllowedNow ?? null,
      },
      blockers: publicSendClosed ? [] : ['public_or_distribution_gate_open_unexpectedly'],
    }),
  ];

  const proposalBlockers = unique(gateMatrix
    .filter((entry) => !entry.ready && entry.id !== 'mailerlite_delivery_logic')
    .flatMap((entry) => entry.blockers));
  const executionCaveats = unique([
    ...(compactSeedExecutionComplete ? [] : ['compact_footer_seed_execution_partial_e02_e03_e04_unsent']),
    ...(publicSummary.readyForExactPublicSendApproval === true ? [] : ['public_send_approval_not_ready_or_not_requested']),
  ]);

  const microproductBrief = buildMicroproductBrief(launch);
  const packet = {
    schemaVersion: SCHEMA_VERSION,
    generatedAt,
    ok: true,
    status: proposalReviewReady
      ? compactSeedExecutionComplete
        ? 'ceo_proposal_packet_ready_for_ceo_review_no_live_changes'
        : 'ceo_proposal_packet_ready_for_ceo_review_with_seed_execution_caveat_no_live_changes'
      : 'ceo_proposal_packet_blocked_before_ceo_review_no_live_changes',
    launch,
    executiveSummary: {
      ceoProposalReviewReady: proposalReviewReady,
      ceoProposalReviewReadyWithSeedCaveat: proposalReviewReady && !compactSeedExecutionComplete,
      pilotLaunchExecutionReady: false,
      productValueReady,
      integratedExperienceReady: integratedReady,
      webShopifyReady: webReady,
      mailerLiteDeliveryReady,
      compactSeedExecutionComplete,
      crmSignalDesignReady: crmProjectionReady,
      publicSendApprovalReady: false,
      liveActionAllowedNow: false,
      blockerCount: proposalBlockers.length,
      blockerIds: proposalBlockers,
      executionCaveatCount: executionCaveats.length,
      executionCaveats,
      nextBoundary: compactSeedExecutionComplete
        ? 'prepare_pilot_distribution_decision_without_send_approval'
        : 'choose_route_for_remaining_compact_footer_seed_tests_or_review_proposal_with_seed_caveat',
    },
    microproductBrief,
    proposalSections: {
      idea: microproductBrief.idea,
      marketHypothesis: microproductBrief.marketHypothesis,
      communitySignal: microproductBrief.audienceSignal,
      valuePromise: microproductBrief.valuePromise,
      productValueGate: {
        status: productValueReviewPacket?.status ?? null,
        passed: productValueReady,
        gates: productValueReviewPacket?.gateMatrix ?? [],
      },
      requiredAssets: {
        resourceType: launch.resourceType,
        finalPublicLinksReady: assetSummary.finalPublicLinksReady ?? null,
        localAssetSlotReadyCount: assetSummary.localAssetSlotReadyCount ?? null,
        publicAudienceSendUrlGateReady: assetSummary.publicAudienceSendUrlGateReady ?? null,
        linkLifecyclePolicy: assetSummary.linkLifecyclePolicy ?? null,
        exactUrlsPrinted: false,
      },
      suggestedFunnel: [
        'Unlisted/noindex resource preview remains the destination for QA and micro-cohort candidates.',
        'MailerLite compact-footer drafts stay assigned to Null Audience until a separate exact approval changes audience or send state.',
        'E01 delivers orientation; E02 offers a small practice; E03 adds editorial depth; E04 invites one-line qualitative feedback.',
        'Next exposure should be manual micro-cohort or opt-in testers after seed evidence is complete and separately approved.',
      ],
      brandGate: {
        status: integratedReady ? 'green_via_integrated_experience_qa' : 'blocked',
        productValueBrandDepthReady: productValueReady,
        ethicalClaimsReady: productValueReady,
      },
      webShopifyReadiness: {
        status: webReady ? 'preview_ready_public_send_closed' : 'blocked',
        finalPublicLinksReady: assetSummary.finalPublicLinksReady ?? null,
        publicAudienceSendUrlGateReady: assetSummary.publicAudienceSendUrlGateReady ?? null,
      },
      mailerLiteDeliveryLogic: {
        status: mailerLiteDeliveryReady
          ? compactSeedExecutionComplete
            ? 'null_audience_compact_drafts_ready_seed_execution_complete'
            : 'null_audience_compact_drafts_ready_seed_partial'
          : 'blocked',
        compactSeedExecutionState: deltaSummary.compactFooterSeedExecutionState ?? null,
        compactFooterSeedInboxArtifactQaReady:
          deltaSummary.compactFooterSeedInboxArtifactQaReady ?? null,
        compactFooterVisualReadbackGreen:
          deltaSummary.compactFooterVisualReadbackGreen ?? null,
        visualSignatureAssetVerified: deltaSummary.visualSignatureAssetVerified ?? null,
        footerNameCompactCount: deltaSummary.footerNameCompactCount ?? null,
        sentLabels: deltaSummary.sentLabels ?? [],
        unsentLabels: deltaSummary.unsentLabels ?? [],
        doNotResendLabels: deltaSummary.doNotResendLabels ?? [],
      },
      crmSignalDesign: {
        status: crmSignalProjectionPacket?.status ?? null,
        approvalGate: crmSignalProjectionPacket?.approvalGate ?? {},
        projectionModel: crmSignalProjectionPacket?.projectionModel ?? {},
      },
      learningCriteria: learningCriteria(crmSignalProjectionPacket, pilotDistributionStrategyPacket),
      nextApprovalOrDecision: {
        asksApprovalNow: false,
        asksPublicSendApprovalNow: false,
        exactApprovalPhraseAvailable: false,
        request: compactSeedExecutionComplete
          ? 'Choose pilot distribution lane before any send approval.'
          : 'Choose whether to retry E02-E04 only through Computer Use semantic controls after fresh preflight, explicitly approve a different test-send route for E02-E04, or review the CEO proposal with the seed caveat.',
      },
    },
    gateMatrix,
    sourceDigests: [],
    safety,
    hardStops: [
      'This CEO Proposal Packet is not approval to build, publish, send, assign an audience, mutate workflows, or write CRM records.',
      compactSeedExecutionComplete
        ? 'Do not resend any compact-footer seed test under the consumed approval.'
        : 'Do not resend E01.',
      'Do not request public/audience send approval from this packet.',
      compactSeedExecutionComplete
        ? 'Any future test resend requires a fresh exact approval and safety preflight.'
        : 'Remaining seed tests E02-E04 still require fresh preflight and a valid approved route.',
      'Exact URLs, recipients, raw IDs and tokens must remain unprinted.',
    ],
  };

  packet.safetyClosed = safetyClosed(packet.safety);
  return packet;
};

const renderList = (items) => items.map((item) => `- ${item}`).join('\n');

const renderMarkdown = (report) => [
  '# MailerLite Mini-launch CEO Proposal Packet',
  '',
  `Generated: ${report.generatedAt}`,
  `Status: ${report.status}`,
  '',
  '## Executive Summary',
  '',
  `- CEO proposal review ready: ${report.executiveSummary.ceoProposalReviewReady}`,
  `- Ready with seed caveat: ${report.executiveSummary.ceoProposalReviewReadyWithSeedCaveat}`,
  `- Pilot launch execution ready: ${report.executiveSummary.pilotLaunchExecutionReady}`,
  `- Product Value ready: ${report.executiveSummary.productValueReady}`,
  `- Integrated experience ready: ${report.executiveSummary.integratedExperienceReady}`,
  `- Web/Shopify ready: ${report.executiveSummary.webShopifyReady}`,
  `- MailerLite delivery ready: ${report.executiveSummary.mailerLiteDeliveryReady}`,
  `- Compact seed execution complete: ${report.executiveSummary.compactSeedExecutionComplete}`,
  `- CRM signal design ready: ${report.executiveSummary.crmSignalDesignReady}`,
  `- Public send approval ready: ${report.executiveSummary.publicSendApprovalReady}`,
  `- Live action allowed now: ${report.executiveSummary.liveActionAllowedNow}`,
  `- Blockers: ${report.executiveSummary.blockerCount}`,
  `- Execution caveats: ${report.executiveSummary.executionCaveatCount}`,
  `- Next boundary: ${report.executiveSummary.nextBoundary}`,
  '',
  '## Proposal',
  '',
  `- Idea: ${report.proposalSections.idea}`,
  `- Market hypothesis: ${report.proposalSections.marketHypothesis}`,
  `- Community signal posture: ${report.microproductBrief.audienceSignalPosture}`,
  `- Value promise: ${report.proposalSections.valuePromise}`,
  '',
  '## Gate Matrix',
  '',
  ...report.gateMatrix.map((entry) =>
    `- ${entry.id}: ${entry.status}; ready=${entry.ready}; blockers=${entry.blockers.join(', ') || 'none'}`
  ),
  '',
  '## Learning Criteria',
  '',
  `- Learning question: ${report.proposalSections.learningCriteria.learningQuestion}`,
  '- Success signals:',
  renderList(report.proposalSections.learningCriteria.successSignals),
  '- Kill/iterate signals:',
  renderList(report.proposalSections.learningCriteria.killOrIterateSignals),
  '',
  '## Next Decision',
  '',
  `- Asks approval now: ${report.proposalSections.nextApprovalOrDecision.asksApprovalNow}`,
  `- Asks public send approval now: ${report.proposalSections.nextApprovalOrDecision.asksPublicSendApprovalNow}`,
  `- Request: ${report.proposalSections.nextApprovalOrDecision.request}`,
  '',
  '## Safety',
  '',
  '- Local-only/report-only packet.',
  '- UI opened: false.',
  '- MailerLite, Shopify and CRM live APIs called: false.',
  '- Sends/subscriber/group/workflow mutations: false.',
  '- Ledger/card/scoring/Fact Store writes: false.',
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
    assetManifest,
    productValueReviewPacket,
    integratedExperienceQaPacket,
    crmSignalProjectionPacket,
    pilotDistributionStrategyPacket,
    ceoReviewReadinessDelta,
    publicLaunchReadinessPacket,
  ] = await Promise.all([
    readJsonWithDigest(options.assetManifest, 'mini-launch asset, URL lifecycle and Web/Shopify readiness'),
    readJsonWithDigest(options.productValueReviewPacket, 'Product Value Gate evidence'),
    readJsonWithDigest(options.integratedExperienceQaPacket, 'Brand/Web/MailerLite integrated QA evidence'),
    readJsonWithDigest(options.crmSignalProjectionPacket, 'CRM signal design and no-live write gates'),
    readJsonWithDigest(options.pilotDistributionStrategyPacket, 'pilot learning lane strategy'),
    readJsonWithDigest(options.ceoReviewReadinessDelta, 'compact-footer seed execution state and CEO delta'),
    readJsonWithDigest(options.publicLaunchReadinessPacket, 'public/audience send gate posture'),
  ]);

  const report = buildCeoProposalPacket({
    assetManifest: assetManifest.value,
    productValueReviewPacket: productValueReviewPacket.value,
    integratedExperienceQaPacket: integratedExperienceQaPacket.value,
    crmSignalProjectionPacket: crmSignalProjectionPacket.value,
    pilotDistributionStrategyPacket: pilotDistributionStrategyPacket.value,
    ceoReviewReadinessDelta: ceoReviewReadinessDelta.value,
    publicLaunchReadinessPacket: publicLaunchReadinessPacket.value,
  });

  report.sourceDigests = [
    assetManifest.digest,
    productValueReviewPacket.digest,
    integratedExperienceQaPacket.digest,
    crmSignalProjectionPacket.digest,
    pilotDistributionStrategyPacket.digest,
    ceoReviewReadinessDelta.digest,
    publicLaunchReadinessPacket.digest,
  ];

  await writeText(options.out, `${JSON.stringify(report, null, 2)}\n`);
  await writeText(options.markdownOut, renderMarkdown(report));

  console.log(JSON.stringify({
    ok: report.ok,
    status: report.status,
    ceoProposalReviewReady: report.executiveSummary.ceoProposalReviewReady,
    readyWithSeedCaveat: report.executiveSummary.ceoProposalReviewReadyWithSeedCaveat,
    productValueReady: report.executiveSummary.productValueReady,
    integratedExperienceReady: report.executiveSummary.integratedExperienceReady,
    webShopifyReady: report.executiveSummary.webShopifyReady,
    mailerLiteDeliveryReady: report.executiveSummary.mailerLiteDeliveryReady,
    compactSeedExecutionComplete: report.executiveSummary.compactSeedExecutionComplete,
    crmSignalDesignReady: report.executiveSummary.crmSignalDesignReady,
    publicSendApprovalReady: report.executiveSummary.publicSendApprovalReady,
    liveActionAllowedNow: report.executiveSummary.liveActionAllowedNow,
    blockerCount: report.executiveSummary.blockerCount,
    executionCaveats: report.executiveSummary.executionCaveats,
    nextBoundary: report.executiveSummary.nextBoundary,
    out: resolve(options.out),
    markdownOut: resolve(options.markdownOut),
    safety: report.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite mini-launch CEO proposal packet failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildCeoProposalPacket,
  parseArgs,
  renderMarkdown,
  safetyClosed,
};
