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
    compactFooterSeedExecutionComplete: false,
    compactFooterSeedExecutionState: "partial_e01_only_remaining_e02_e03_e04_blocked",
    sentLabels: ["E01"],
    unsentLabels: ["E02", "E03", "E04"],
    doNotResendLabels: ["E01"],
    liveActionAllowedNow: false,
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
