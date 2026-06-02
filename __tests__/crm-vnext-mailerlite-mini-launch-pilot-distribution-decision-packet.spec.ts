import { describe, expect, test } from "vitest";

import {
  buildPilotDistributionDecisionPacket,
  buildSafety,
  parseArgs,
  renderMarkdown,
  safetyClosed,
} from "../scripts/crm-vnext-mailerlite-mini-launch-pilot-distribution-decision-packet.mjs";

const launch = {
  launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
  resourceName: "Inteligencia para descansar",
  resourceType: "quiz",
};

const ceoProposalPacket = {
  status: "ceo_proposal_packet_ready_for_ceo_review_no_live_changes",
  launch,
  executiveSummary: {
    ceoProposalReviewReady: true,
    ceoProposalReviewReadyWithSeedCaveat: false,
    compactSeedExecutionComplete: true,
    publicSendApprovalReady: false,
    liveActionAllowedNow: false,
    blockerCount: 0,
  },
};

const ceoReviewReadinessDelta = {
  status: "ceo_review_readiness_delta_ready_no_live_changes",
  launch,
  executiveSummary: {
    ceoReviewPackageReady: true,
    readyForPilotDistributionDecisionNow: true,
    readyForPublicSendApprovalNow: false,
    liveActionAllowedNow: false,
    compactFooterSeedInboxArtifactQaReady: true,
    compactFooterVisualReadbackGreen: true,
    blockerCount: 0,
  },
};

const publicSendPreflightDecisionPacket = {
  status: "public_send_preflight_decision_packet_blocked_missing_evidence_no_live_changes",
  launch,
  executiveSummary: {
    recommendedAudienceScopeId: "keep_null_audience_no_public_send",
    massSubscriberSendRecommendedNow: false,
    existingActiveSubscriberAudienceFutureOptionOnly: true,
    exactApprovalPhraseAvailable: false,
    canExecuteNow: false,
    liveActionAllowedNow: false,
  },
};

const publicAudienceScopePacket = {
  status: "public_audience_scope_packet_ready_blocked_no_live_changes",
  launch,
  executiveSummary: {
    recommendedDefaultNow: "keep_null_audience_no_public_send",
    currentSafetyGroupActiveCount: 0,
    massSubscriberSendRecommendedNow: false,
    existingActiveSubscriberAudienceFutureOptionOnly: true,
    currentDraftsRemainInertUntilExactApproval: true,
  },
  audienceScopeOptions: [
    {
      id: "keep_null_audience_no_public_send",
      knownActiveCount: 0,
    },
    {
      id: "manual_micro_cohort",
      knownActiveCount: null,
    },
    {
      id: "opt_in_testers",
      knownActiveCount: null,
    },
    {
      id: "existing_legacy_onboarding_complete_campaign_audience",
      knownActiveCount: 933,
    },
  ],
};

const pilotDistributionInputRequestPacket = {
  status: "pilot_distribution_input_request_packet_blocked_missing_evidence_no_live_changes",
  launch,
  executiveSummary: {
    recommendedDecisionKind: "strategy_input_only_no_send",
    recommendedDecisionOptions: [
      "keep_null_audience_no_public_send",
      "manual_micro_cohort_next",
      "opt_in_testers_next",
    ],
    canAskFinalSendApprovalNow: false,
    liveActionAllowedNow: false,
  },
};

const buildReport = (overrides = {}) => buildPilotDistributionDecisionPacket({
  ceoProposalPacket,
  ceoReviewReadinessDelta,
  publicSendPreflightDecisionPacket,
  publicAudienceScopePacket,
  pilotDistributionInputRequestPacket,
  generatedAt: "2026-06-02T00:00:00.000Z",
  ...overrides,
});

describe("CRM vNext MailerLite mini-launch pilot distribution decision packet", () => {
  test("parses explicit inputs", () => {
    const parsed = parseArgs([
      "--ceo-proposal-packet",
      "/tmp/ceo.json",
      "--ceo-review-readiness-delta",
      "/tmp/delta.json",
      "--public-send-preflight-decision-packet",
      "/tmp/preflight.json",
      "--public-audience-scope-packet",
      "/tmp/scope.json",
      "--pilot-distribution-input-request-packet",
      "/tmp/input.json",
      "--out",
      "/tmp/out.json",
      "--markdown-out",
      "/tmp/out.md",
    ]);

    expect(parsed.ceoProposalPacket).toBe("/tmp/ceo.json");
    expect(parsed.ceoReviewReadinessDelta).toBe("/tmp/delta.json");
    expect(parsed.publicSendPreflightDecisionPacket).toBe("/tmp/preflight.json");
    expect(parsed.publicAudienceScopePacket).toBe("/tmp/scope.json");
    expect(parsed.pilotDistributionInputRequestPacket).toBe("/tmp/input.json");
    expect(parsed.out).toBe("/tmp/out.json");
  });

  test("builds a no-send pilot lane decision packet from CEO v2 evidence", () => {
    const report = buildReport();
    const markdown = renderMarkdown(report);

    expect(report.status).toBe("pilot_distribution_decision_packet_no_send_ready_no_live_changes");
    expect(report.executiveSummary).toMatchObject({
      decisionPacketReady: true,
      ceoPacketReady: true,
      ceoReadinessReady: true,
      noSendPreflightAligned: true,
      audienceScopeAligned: true,
      canAskPilotLaneDecisionNow: true,
      asksPublicSendApprovalNow: false,
      canAskFinalSendApprovalNow: false,
      exactApprovalPhraseAvailable: false,
      liveActionAllowedNow: false,
      wouldAuthorizeSend: false,
      wouldAuthorizeAudienceAssignment: false,
      currentDefault: "keep_null_audience_no_public_send",
      blockerCount: 0,
    });
    expect(report.executiveSummary.recommendedDecisionOptions).toEqual([
      "keep_null_audience_no_public_send",
      "manual_micro_cohort_next",
      "opt_in_testers_next",
    ]);
    expect(report.decisionOptions.find((option) => option.id === "manual_micro_cohort_next")).toMatchObject({
      recommendedNow: true,
      wouldAuthorizeSend: false,
      wouldAuthorizeAudienceAssignment: false,
    });
    expect(report.requestedHumanText.notApprovalFor).toContain("public/audience send");
    expect(report.blockedLiveBoundaries).toContain("public_or_audience_send");
    expect(markdown).toContain("Pilot Distribution Decision Packet No-Send");
    expect(markdown).toContain("Would authorize send: false");
    expect(safetyClosed(report.safety)).toBe(true);
  });

  test("blocks the packet when CEO review evidence is no longer green", () => {
    const report = buildReport({
      ceoProposalPacket: {
        ...ceoProposalPacket,
        executiveSummary: {
          ...ceoProposalPacket.executiveSummary,
          ceoProposalReviewReady: false,
          blockerCount: 1,
        },
      },
    });

    expect(report.status).toBe("pilot_distribution_decision_packet_no_send_blocked_missing_evidence_no_live_changes");
    expect(report.executiveSummary.decisionPacketReady).toBe(false);
    expect(report.executiveSummary.canAskPilotLaneDecisionNow).toBe(false);
    expect(report.executiveSummary.blockers).toContain("ceo_proposal_packet_not_ready");
    expect(report.executiveSummary.liveActionAllowedNow).toBe(false);
  });

  test("keeps safety closed by default", () => {
    expect(buildSafety()).toMatchObject({
      localOnly: true,
      reportsOnly: true,
      exactApprovalPhraseAvailable: false,
      mailerLiteApiCalled: false,
      shopifyApiCalled: false,
      crmLiveApiCalled: false,
      subscribersRead: false,
      sendsPerformed: false,
      factStoreWritePerformed: false,
    });
  });
});
