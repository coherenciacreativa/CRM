import { describe, expect, test } from "vitest";

import {
  buildCeoReviewReadinessDelta,
  parseArgs,
  safetyClosed,
} from "../scripts/crm-vnext-mailerlite-mini-launch-ceo-review-readiness-delta.mjs";

const productValueReadyPacket = {
  status: "product_value_review_ready_for_ceo_review_no_live_changes",
  executiveSummary: {
    productValueReviewPassed: true,
    ceoReviewValueReady: true,
    readyGateCount: 7,
    blockerCount: 0,
    blockers: [],
    clickthroughVerified: true,
  },
};

const integratedBlockedPacket = {
  status: "integrated_experience_qa_blocked_before_ceo_review_no_live_changes",
  executiveSummary: {
    ceoReviewReady: false,
    integratedExperienceReady: false,
    distributionDecisionShouldWait: true,
    canAskPilotDistributionDecisionNow: false,
    blockerCount: 3,
    blockers: [
      "visual_signature_asset_not_verified",
      "signature_fallback_still_present_in_payload",
      "platform_footer_policy_is_not_canonical_footer_proof",
    ],
    productValueReviewPassed: true,
  },
};

const integratedReadyPacket = {
  status: "integrated_experience_qa_ready_for_ceo_review_no_live_changes",
  executiveSummary: {
    ceoReviewReady: true,
    integratedExperienceReady: true,
    distributionDecisionShouldWait: false,
    canAskPilotDistributionDecisionNow: true,
    blockerCount: 0,
    blockers: [],
    productValueReviewPassed: true,
  },
};

const publicClosedPacket = {
  status: "mini_launch_public_launch_readiness_blocked_missing_evidence_no_live_changes",
  executiveSummary: {
    readyForExactPublicSendApproval: false,
    liveActionAllowedNow: false,
    publicAudienceSendUrlGateReady: false,
    publicAudienceScopeReady: false,
    crmObservedEventsReady: false,
  },
};

const compactReplacementReceipt = {
  ok: true,
  status: "mailerlite_null_audience_replacement_execution_completed_no_sends",
  postCreateQa: {
    replacementDraftCount: 4,
    nullAudienceSafeCount: 4,
    contentGreenCount: 4,
    rows: ["E01", "E02", "E03", "E04"].map((label) => ({
      label,
      nullAudienceSafe: true,
      contentHasPlaceholder: false,
      observed: {
        status: "draft",
        groupActiveCount: 0,
        filterGroupIdCount: 1,
        filterSegmentIdCount: 0,
        scheduledFor: null,
        usedInAutomations: false,
      },
    })),
  },
};

const compactSeedPreflight = {
  ok: true,
  status: "mailerlite_null_audience_seed_test_send_preflight_ready_for_exact_approval",
  generatedAt: "2026-06-02T00:00:00.000Z",
  preflight: {
    targetCount: 4,
    qaGreenCount: 4,
    safetyGroupActiveCount: 0,
  },
  targetPlan: ["E01", "E02", "E03", "E04"].map((label) => ({
    label,
    status: "draft",
    nullAudienceSafe: true,
    contentMatchesCreationReceipt: true,
    placeholderCount: 0,
    redactedFinalLinkTokenCount: 0,
    rowBlockers: [],
  })),
};

const partialUiBlocker = {
  approval: {
    compactFooterSeedTestApprovalConsumed: "partial_e01_only",
    remainingUnsentLabels: ["E02", "E03", "E04"],
    doNotResendLabels: ["E01"],
  },
  uiExecution: {
    sentLabels: ["E01"],
    unsentLabels: ["E02", "E03", "E04"],
    recordUiSentReceiptCreated: false,
    computerUseSemanticSendCompleted: "partial_e01_only",
    semanticSuccessObservedText: "Test email sent.",
    blocker: "e02_send_test_control_not_exposed_semantically_after_direct_dashboard_route_and_overview_alternative_without_coordinates_or_nonsemantic_fallbacks",
  },
  operatorPolicy: {
    screenshotsOrCapturesAllowedForUiOperation: false,
    coordinateClicksAllowed: false,
    systemClickFallbackAllowed: false,
    browserDomOrAppleScriptClickInjectionAllowed: false,
    apiTestSendEndpointAllowedAsPrimaryRoute: false,
  },
  nextBoundary: {
    doNotAskSameApprovalAgainUnlessEvidenceChanges: true,
  },
};

const completedUiReceipt = {
  approval: {
    compactFooterSeedTestApprovalConsumed: "complete_e01_e02_e03_e04",
    remainingUnsentLabels: [],
    doNotResendLabels: ["E01", "E02", "E03", "E04"],
  },
  uiExecution: {
    sentLabels: ["E01", "E02", "E03", "E04"],
    unsentLabels: [],
    recordUiSentReceiptCreated: true,
    computerUseSemanticSendCompleted: "all_e01_e02_e03_e04",
  },
  operatorPolicy: partialUiBlocker.operatorPolicy,
};

const completedRecordUiSentReceipt = {
  ok: true,
  status: "mailerlite_null_audience_seed_test_send_completed_test_only",
  mode: "record_ui_sent",
  preflight: {
    targetCount: 4,
    qaGreenCount: 4,
    safetyGroupActiveCount: 0,
  },
  targetPlan: ["E01", "E02", "E03", "E04"].map((label) => ({ label })),
  sentTests: ["E01", "E02", "E03", "E04"].map((label) => ({ label })),
  safety: {
    testSendExecutionChannel: "mailerlite_ui_manual_assisted",
    audienceSendsPerformed: false,
    campaignsPublished: false,
    campaignsScheduled: false,
    subscribersRead: false,
    subscriberMutationsPerformed: false,
    additionalGroupsCreatedOrAssigned: false,
    workflowMutationsPerformed: false,
    exactUrlsPrinted: false,
    tokensPrinted: false,
  },
};

const baseInput = {
  productValueReviewPacket: productValueReadyPacket,
  publicLaunchReadinessPacket: publicClosedPacket,
  compactFooterReplacementReceipt: compactReplacementReceipt,
  compactFooterSeedPreflight: compactSeedPreflight,
  currentStateRefresh: {
    status: "mailerlite_launch_os_current_state_refresh_ready_no_live_changes",
  },
  goalAudit: {
    status: "goal_active_not_ready_for_live_operation",
    executiveSummary: {
      currentOperatingPosture: "continue_no_live_build_and_reviews",
    },
  },
  generatedAt: "2026-06-02T00:00:00.000Z",
};

describe("CRM vNext MailerLite mini-launch CEO-review readiness delta", () => {
  test("parses explicit inputs", () => {
    const parsed = parseArgs([
      "--product-value-review-packet",
      "/tmp/product.json",
      "--integrated-experience-qa-packet",
      "/tmp/integrated.json",
      "--public-launch-readiness-packet",
      "/tmp/public.json",
      "--compact-footer-replacement-receipt",
      "/tmp/replacement.json",
      "--compact-footer-seed-preflight",
      "/tmp/preflight.json",
      "--compact-footer-seed-ui-blocker",
      "/tmp/blocker.json",
      "--current-state-refresh",
      "/tmp/current.json",
      "--goal-audit",
      "/tmp/goal.json",
      "--out",
      "/tmp/out.json",
      "--markdown-out",
      "/tmp/out.md",
    ]);

    expect(parsed.productValueReviewPacket).toBe("/tmp/product.json");
    expect(parsed.compactFooterSeedUiBlocker).toBe("/tmp/blocker.json");
    expect(parsed.out).toBe("/tmp/out.json");
  });

  test("marks the compact-footer CEO-review package not ready when E02-E04 are blocked semantically", () => {
    const report = buildCeoReviewReadinessDelta({
      ...baseInput,
      integratedExperienceQaPacket: integratedBlockedPacket,
      compactFooterSeedUiBlocker: partialUiBlocker,
    });

    expect(report.status).toBe("ceo_review_readiness_delta_not_ready_no_live_changes");
    expect(report.executiveSummary).toMatchObject({
      ceoReviewPackageReady: false,
      ceoReviewValueReady: true,
      integratedExperienceReady: false,
      compactFooterDraftsReady: true,
      compactFooterSeedPreflightGreen: true,
      compactFooterSeedExecutionComplete: false,
      compactFooterSeedExecutionState: "partial_e01_only_remaining_e02_e03_e04_blocked",
      readyForPilotDistributionDecisionNow: false,
      readyForPublicSendApprovalNow: false,
      liveActionAllowedNow: false,
      sentLabels: ["E01"],
      unsentLabels: ["E02", "E03", "E04"],
      doNotResendLabels: ["E01"],
    });
    expect(report.executiveSummary.blockerIds).toEqual(expect.arrayContaining([
      "visual_signature_asset_not_verified",
      "compact_footer_remaining_seed_tests_unsent",
    ]));
    expect(report.decisionBoundary.notAllowedWithoutFreshApprovalOrEvidence)
      .toContain("use_api_test_send_as_primary_route");
    expect(safetyClosed(report.safety)).toBe(true);
  });

  test("does not turn CEO readiness into public-send approval", () => {
    const report = buildCeoReviewReadinessDelta({
      ...baseInput,
      integratedExperienceQaPacket: integratedReadyPacket,
      compactFooterSeedUiBlocker: completedUiReceipt,
    });

    expect(report.status).toBe("ceo_review_readiness_delta_ready_no_live_changes");
    expect(report.executiveSummary.ceoReviewPackageReady).toBe(true);
    expect(report.executiveSummary.readyForPilotDistributionDecisionNow).toBe(true);
    expect(report.executiveSummary.readyForPublicSendApprovalNow).toBe(false);
    expect(report.executiveSummary.liveActionAllowedNow).toBe(false);
    expect(report.gateMatrix.find((entry) => entry.id === "public_or_audience_send")?.status)
      .toBe("closed_not_ready_for_exact_public_send_approval");
  });

  test("treats final record_ui_sent execution receipt as complete seed execution evidence", () => {
    const report = buildCeoReviewReadinessDelta({
      ...baseInput,
      integratedExperienceQaPacket: integratedReadyPacket,
      compactFooterSeedUiBlocker: completedRecordUiSentReceipt,
    });

    expect(report.status).toBe("ceo_review_readiness_delta_ready_no_live_changes");
    expect(report.executiveSummary).toMatchObject({
      ceoReviewPackageReady: true,
      compactFooterSeedExecutionComplete: true,
      compactFooterSeedExecutionState: "complete_e01_e02_e03_e04",
      sentLabels: ["E01", "E02", "E03", "E04"],
      unsentLabels: [],
      doNotResendLabels: ["E01", "E02", "E03", "E04"],
    });
    const seedGate = report.gateMatrix.find((entry) => entry.id === "compact_footer_seed_execution");
    expect(seedGate?.evidence).toMatchObject({
      evidenceKind: "record_ui_sent_execution_receipt",
      finalReceiptStatus: "mailerlite_null_audience_seed_test_send_completed_test_only",
      finalReceiptMode: "record_ui_sent",
      testSendExecutionChannel: "mailerlite_ui_manual_assisted",
    });
    expect(report.decisionBoundary.notAllowedWithoutFreshApprovalOrEvidence)
      .toContain("resend_any_compact_footer_seed_test");
    expect(safetyClosed(report.safety)).toBe(true);
  });
});
