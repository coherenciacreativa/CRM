import { describe, expect, test } from "vitest";

import {
  buildCeoProposalPacket,
  parseArgs,
  safetyClosed,
} from "../scripts/crm-vnext-mailerlite-mini-launch-ceo-proposal-packet.mjs";

const assetManifest = {
  status: "mini_launch_asset_manifest_ready_for_correction_inputs_no_live_changes",
  launch: {
    launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
    resourceName: "Inteligencia para descansar",
    resourceType: "quiz",
  },
  executiveSummary: {
    finalPublicLinksReady: true,
    publicAudienceSendUrlGateReady: false,
    localAssetSlotReadyCount: 3,
    previewUrlReadyCount: 3,
    linkLifecyclePolicy: "single_slot_preview_to_live_lifecycle",
  },
};

const productValueReviewPacket = {
  status: "product_value_review_ready_for_ceo_review_no_live_changes",
  executiveSummary: {
    productValueReviewPassed: true,
    ceoReviewValueReady: true,
    readyGateCount: 7,
    blockerCount: 0,
    blockers: [],
    clickthroughVerified: true,
  },
  gateMatrix: [
    { id: "audience_pain_fit", ready: true },
    { id: "crm_learning_value", ready: true },
  ],
};

const integratedExperienceQaPacket = {
  status: "integrated_experience_qa_ready_for_ceo_review_no_live_changes",
  executiveSummary: {
    ceoReviewReady: true,
    integratedExperienceReady: true,
    blockerCount: 0,
    blockers: [],
    canAskPublicSendApprovalNow: false,
  },
};

const crmSignalProjectionPacket = {
  status: "ready_for_no_live_signal_projection_design",
  approvalGate: {
    canAppendSignalLedgerNow: false,
    canWriteCardsNow: false,
    canScoreNow: false,
    canWriteFactStoreNow: false,
  },
  projectionModel: {
    currentProjectionReadyFor: ["email_open", "email_click", "email_reply"],
    storeOnlyNow: ["quiz_result", "delivery_receipt"],
  },
};

const pilotDistributionStrategyPacket = {
  executiveSummary: {
    recommendedStrategyId: "keep_null_audience_then_micro_cohort_or_opt_in_before_broad_send",
    canAskFinalSendApprovalNow: false,
    liveActionAllowedNow: false,
    nextLearningLanes: ["manual_micro_cohort_next", "opt_in_testers_next"],
  },
};

const ceoReviewReadinessDelta = {
  executiveSummary: {
    compactFooterDraftsReady: true,
    compactFooterSeedPreflightGreen: true,
    compactFooterSeedInboxArtifactQaReady: true,
    compactFooterVisualReadbackGreen: true,
    visualSignatureAssetVerified: true,
    visualSignatureRenderedCount: 4,
    footerNameCompactCount: 4,
    duplicatePostalAddressVisibleCount: 0,
    duplicateTypedAlejandroAfterClosingCount: 0,
    compactFooterSeedExecutionComplete: false,
    compactFooterSeedExecutionState: "partial_e01_only_remaining_e02_e03_e04_blocked",
    sentLabels: ["E01"],
    unsentLabels: ["E02", "E03", "E04"],
    doNotResendLabels: ["E01"],
    liveActionAllowedNow: false,
  },
};

const completedSeedCeoReviewReadinessDelta = {
  executiveSummary: {
    ...ceoReviewReadinessDelta.executiveSummary,
    compactFooterSeedExecutionComplete: true,
    compactFooterSeedExecutionState: "complete_e01_e02_e03_e04",
    sentLabels: ["E01", "E02", "E03", "E04"],
    unsentLabels: [],
    doNotResendLabels: ["E01", "E02", "E03", "E04"],
  },
};

const publicLaunchReadinessPacket = {
  status: "mini_launch_public_launch_readiness_blocked_missing_evidence_no_live_changes",
  executiveSummary: {
    readyForExactPublicSendApproval: false,
    liveActionAllowedNow: false,
  },
};

const baseInput = {
  assetManifest,
  productValueReviewPacket,
  integratedExperienceQaPacket,
  crmSignalProjectionPacket,
  pilotDistributionStrategyPacket,
  ceoReviewReadinessDelta,
  publicLaunchReadinessPacket,
  generatedAt: "2026-06-02T00:00:00.000Z",
};

describe("CRM vNext MailerLite mini-launch CEO proposal packet", () => {
  test("parses explicit inputs", () => {
    const parsed = parseArgs([
      "--asset-manifest",
      "/tmp/assets.json",
      "--product-value-review-packet",
      "/tmp/product.json",
      "--integrated-experience-qa-packet",
      "/tmp/integrated.json",
      "--crm-signal-projection-packet",
      "/tmp/crm.json",
      "--pilot-distribution-strategy-packet",
      "/tmp/pilot.json",
      "--ceo-review-readiness-delta",
      "/tmp/delta.json",
      "--public-launch-readiness-packet",
      "/tmp/public.json",
      "--out",
      "/tmp/out.json",
      "--markdown-out",
      "/tmp/out.md",
    ]);

    expect(parsed.assetManifest).toBe("/tmp/assets.json");
    expect(parsed.crmSignalProjectionPacket).toBe("/tmp/crm.json");
    expect(parsed.out).toBe("/tmp/out.json");
  });

  test("builds a CEO-review-ready proposal with a seed execution caveat and no live permission", () => {
    const report = buildCeoProposalPacket(baseInput);

    expect(report.status).toBe("ceo_proposal_packet_ready_for_ceo_review_with_seed_execution_caveat_no_live_changes");
    expect(report.executiveSummary).toMatchObject({
      ceoProposalReviewReady: true,
      ceoProposalReviewReadyWithSeedCaveat: true,
      pilotLaunchExecutionReady: false,
      productValueReady: true,
      integratedExperienceReady: true,
      webShopifyReady: true,
      mailerLiteDeliveryReady: true,
      compactSeedExecutionComplete: false,
      crmSignalDesignReady: true,
      publicSendApprovalReady: false,
      liveActionAllowedNow: false,
      blockerCount: 0,
    });
    expect(report.executiveSummary.executionCaveats).toEqual(expect.arrayContaining([
      "compact_footer_seed_execution_partial_e02_e03_e04_unsent",
      "public_send_approval_not_ready_or_not_requested",
    ]));
    expect(report.proposalSections.nextApprovalOrDecision).toMatchObject({
      asksApprovalNow: false,
      asksPublicSendApprovalNow: false,
      exactApprovalPhraseAvailable: false,
    });
    expect(report.gateMatrix.find((entry) => entry.id === "mailerlite_delivery_logic")?.blockers)
      .toContain("compact_footer_seed_execution_partial_e02_e03_e04_unsent");
    expect(safetyClosed(report.safety)).toBe(true);
  });

  test("removes the seed execution caveat when compact-footer seed tests are complete", () => {
    const report = buildCeoProposalPacket({
      ...baseInput,
      ceoReviewReadinessDelta: completedSeedCeoReviewReadinessDelta,
    });

    expect(report.status).toBe("ceo_proposal_packet_ready_for_ceo_review_no_live_changes");
    expect(report.executiveSummary).toMatchObject({
      ceoProposalReviewReady: true,
      ceoProposalReviewReadyWithSeedCaveat: false,
      compactSeedExecutionComplete: true,
      publicSendApprovalReady: false,
      liveActionAllowedNow: false,
      executionCaveatCount: 1,
      nextBoundary: "prepare_pilot_distribution_decision_without_send_approval",
    });
    expect(report.executiveSummary.executionCaveats).not.toContain(
      "compact_footer_seed_execution_partial_e02_e03_e04_unsent",
    );
    expect(report.proposalSections.mailerLiteDeliveryLogic.status)
      .toBe("null_audience_compact_drafts_ready_seed_execution_complete");
    expect(report.proposalSections.mailerLiteDeliveryLogic).toMatchObject({
      compactFooterSeedInboxArtifactQaReady: true,
      compactFooterVisualReadbackGreen: true,
      visualSignatureAssetVerified: true,
      footerNameCompactCount: 4,
    });
    expect(report.proposalSections.nextApprovalOrDecision.asksPublicSendApprovalNow).toBe(false);
    expect(report.hardStops).toContain("Do not resend any compact-footer seed test under the consumed approval.");
    expect(report.hardStops).not.toContain("Remaining seed tests E02-E04 still require fresh preflight and a valid approved route.");
    expect(safetyClosed(report.safety)).toBe(true);
  });

  test("blocks CEO proposal review when Product Value Gate is not green", () => {
    const report = buildCeoProposalPacket({
      ...baseInput,
      productValueReviewPacket: {
        status: "product_value_review_blocked_before_ceo_review_no_live_changes",
        executiveSummary: {
          productValueReviewPassed: false,
          ceoReviewValueReady: false,
          blockerCount: 1,
          blockers: ["audience_pain_fit_not_clear"],
        },
      },
    });

    expect(report.status).toBe("ceo_proposal_packet_blocked_before_ceo_review_no_live_changes");
    expect(report.executiveSummary.ceoProposalReviewReady).toBe(false);
    expect(report.executiveSummary.blockerIds).toContain("audience_pain_fit_not_clear");
    expect(report.proposalSections.nextApprovalOrDecision.asksApprovalNow).toBe(false);
  });
});
