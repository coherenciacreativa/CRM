import { describe, expect, test } from "vitest";

import {
  STRATEGY_DECISION_PHRASE,
  buildSafety,
  buildSiboReviewPacket,
  parseArgs,
  renderHtml,
  renderMarkdown,
  safetyClosed,
} from "../scripts/crm-vnext-mailerlite-mini-launch-sibo-review-packet.mjs";

const launch = {
  launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
  resourceName: "Inteligencia para descansar",
  resourceType: "quiz",
};

const pilotDistributionDecisionPacket = {
  status: "pilot_distribution_decision_packet_no_send_ready_no_live_changes",
  launch,
  executiveSummary: {
    decisionPacketReady: true,
    canAskPilotLaneDecisionNow: true,
    asksPublicSendApprovalNow: false,
    canAskFinalSendApprovalNow: false,
    exactApprovalPhraseAvailable: false,
    liveActionAllowedNow: false,
    wouldAuthorizeSend: false,
    wouldAuthorizeAudienceAssignment: false,
    currentDefault: "keep_null_audience_no_public_send",
    blockerCount: 0,
  },
};

const ceoProposalPacket = {
  status: "ceo_proposal_packet_ready_for_ceo_review_no_live_changes",
  launch,
  executiveSummary: {
    ceoProposalReviewReady: true,
    ceoProposalReviewReadyWithSeedCaveat: false,
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
    blockerCount: 0,
  },
};

const buildReport = (overrides = {}) => buildSiboReviewPacket({
  pilotDistributionDecisionPacket,
  ceoProposalPacket,
  ceoReviewReadinessDelta,
  generatedAt: "2026-06-02T00:00:00.000Z",
  ...overrides,
});

describe("CRM vNext MailerLite mini-launch SIBO review packet", () => {
  test("parses explicit inputs", () => {
    const parsed = parseArgs([
      "--pilot-distribution-decision-packet",
      "/tmp/decision.json",
      "--ceo-proposal-packet",
      "/tmp/ceo.json",
      "--ceo-review-readiness-delta",
      "/tmp/delta.json",
      "--out",
      "/tmp/out.json",
      "--markdown-out",
      "/tmp/out.md",
      "--html-out",
      "/tmp/out.html",
    ]);

    expect(parsed.pilotDistributionDecisionPacket).toBe("/tmp/decision.json");
    expect(parsed.ceoProposalPacket).toBe("/tmp/ceo.json");
    expect(parsed.ceoReviewReadinessDelta).toBe("/tmp/delta.json");
    expect(parsed.out).toBe("/tmp/out.json");
    expect(parsed.markdownOut).toBe("/tmp/out.md");
    expect(parsed.htmlOut).toBe("/tmp/out.html");
  });

  test("builds a CEO-facing no-send review packet with an exact strategy phrase", () => {
    const report = buildReport();
    const markdown = renderMarkdown(report);
    const html = renderHtml(report);

    expect(report.status).toBe("sibo_review_packet_no_send_ready_no_live_changes");
    expect(report.executiveSummary).toMatchObject({
      reviewPacketReady: true,
      decisionPacketReady: true,
      ceoProposalReady: true,
      ceoReadinessReady: true,
      recommendedStrategyChoice: "keep_null_audience_no_public_send",
      strategyDecisionPhraseAvailable: true,
      exactApprovalPhraseAvailable: false,
      asksPublicSendApprovalNow: false,
      liveActionAllowedNow: false,
      wouldAuthorizeSend: false,
      wouldAuthorizeAudienceAssignment: false,
      blockerCount: 0,
    });
    expect(report.siboReview.exactStrategyDecisionPhrase).toBe(STRATEGY_DECISION_PHRASE);
    expect(report.siboReview.decisionOptions[0]).toMatchObject({
      id: "keep_null_audience_no_public_send",
      recommendedForCurrentStrategy: true,
      wouldAuthorizeSend: false,
    });
    expect(report.notApprovalFor).toContain("public/audience send");
    expect(markdown).toContain("SIBO Review Packet No-Send");
    expect(markdown).toContain("Exact Strategy Decision Phrase");
    expect(html).toContain("<title>SIBO Review Packet - Inteligencia para descansar</title>");
    expect(html).toContain("Would authorize send:");
    expect(safetyClosed(report.safety)).toBe(true);
  });

  test("blocks presentation if the no-send decision packet is stale or not ready", () => {
    const report = buildReport({
      pilotDistributionDecisionPacket: {
        ...pilotDistributionDecisionPacket,
        executiveSummary: {
          ...pilotDistributionDecisionPacket.executiveSummary,
          decisionPacketReady: false,
          blockerCount: 1,
        },
      },
    });

    expect(report.status).toBe("sibo_review_packet_no_send_blocked_missing_evidence_no_live_changes");
    expect(report.executiveSummary.reviewPacketReady).toBe(false);
    expect(report.executiveSummary.blockers).toContain("pilot_distribution_decision_packet_not_ready");
    expect(report.executiveSummary.liveActionAllowedNow).toBe(false);
  });

  test("keeps live safety closed while allowing the strategy decision phrase", () => {
    expect(buildSafety()).toMatchObject({
      localOnly: true,
      reportsOnly: true,
      strategyDecisionPhraseAvailable: true,
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
