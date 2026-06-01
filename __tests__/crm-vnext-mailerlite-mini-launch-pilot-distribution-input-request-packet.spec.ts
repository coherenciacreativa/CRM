import { describe, expect, test } from "vitest";

import {
  buildPilotDistributionInputRequestPacket,
  buildSafety,
  parseArgs,
  renderMarkdown,
} from "../scripts/crm-vnext-mailerlite-mini-launch-pilot-distribution-input-request-packet.mjs";

const launch = {
  launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
  resourceName: "Inteligencia para descansar",
  resourceType: "quiz",
};

const pilotDistributionStrategyPacket = {
  ok: true,
  status: "pilot_distribution_strategy_packet_ready_no_live_changes",
  launch,
  executiveSummary: {
    strategyDecisionReadyForExplanation: true,
    recommendedStrategyId: "keep_null_audience_then_micro_cohort_or_opt_in_before_broad_send",
    canAskFinalSendApprovalNow: false,
    liveActionAllowedNow: false,
  },
};

const publicSendPreflightDecisionPacket = {
  ok: true,
  status: "public_send_preflight_decision_packet_ready_for_human_explanation_no_live_changes",
  launch,
  executiveSummary: {
    recommendedAudienceScopeId: "keep_null_audience_no_public_send",
    massSubscriberSendRecommendedNow: false,
    exactApprovalPhraseAvailable: false,
    canExecuteNow: false,
  },
};

const publicAudienceScopePacket = {
  ok: true,
  status: "public_audience_scope_packet_ready_blocked_no_live_changes",
  executiveSummary: {
    recommendedDefaultNow: "keep_null_audience_no_public_send",
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

const buildReport = (overrides = {}) => buildPilotDistributionInputRequestPacket({
  pilotDistributionStrategyPacket,
  publicSendPreflightDecisionPacket,
  publicAudienceScopePacket,
  generatedAt: "2026-06-01T00:00:00.000Z",
  ...overrides,
});

describe("CRM vNext MailerLite mini-launch pilot distribution input request packet", () => {
  test("normalizes args and defaults to local reports", () => {
    const parsed = parseArgs([
      "--pilot-distribution-strategy-packet",
      "/tmp/strategy.json",
      "--public-send-preflight-decision-packet",
      "/tmp/preflight.json",
      "--public-audience-scope-packet",
      "/tmp/scope.json",
      "--out",
      "/tmp/input-request.json",
      "--markdown-out",
      "/tmp/input-request.md",
    ]);

    expect(parsed.pilotDistributionStrategyPacket).toBe("/tmp/strategy.json");
    expect(parsed.publicSendPreflightDecisionPacket).toBe("/tmp/preflight.json");
    expect(parsed.publicAudienceScopePacket).toBe("/tmp/scope.json");
    expect(parsed.out).toBe("/tmp/input-request.json");
    expect(parsed.markdownOut).toBe("/tmp/input-request.md");
  });

  test("creates a strategy-only input request without opening final send approval", () => {
    const report = buildReport();
    const markdown = renderMarkdown(report);

    expect(report.ok).toBe(true);
    expect(report.status).toBe("pilot_distribution_input_request_packet_ready_no_live_changes");
    expect(report.executiveSummary.inputRequestReady).toBe(true);
    expect(report.executiveSummary.canAskPilotLaneDecisionNow).toBe(true);
    expect(report.executiveSummary.canAskFinalSendApprovalNow).toBe(false);
    expect(report.executiveSummary.exactApprovalPhraseAvailable).toBe(false);
    expect(report.executiveSummary.liveActionAllowedNow).toBe(false);
    expect(report.executiveSummary.currentDefault).toBe("keep_null_audience_no_public_send");
    expect(report.executiveSummary.recommendedDecisionKind).toBe("strategy_input_only_no_send");
    expect(report.executiveSummary.recommendedDecisionOptions).toEqual([
      "keep_null_audience_no_public_send",
      "manual_micro_cohort_next",
      "opt_in_testers_next",
    ]);
    expect(report.executiveSummary.recommendedNextIfNoHumanRoster).toBe("keep_null_audience_no_public_send");
    expect(report.executiveSummary.broadActiveSubscriberSendRecommendedNow).toBe(false);
    expect(report.executiveSummary.existingActiveSubscriberAudienceFutureOnly).toBe(true);
    expect(report.executiveSummary.existingActiveSubscriberAudienceKnownActiveCount).toBe(933);
    expect(report.inputRequests.map((request) => request.id)).toEqual([
      "pilot_lane_strategy_decision",
      "manual_micro_cohort_candidate_roster",
      "opt_in_tester_roster",
    ]);
    expect(report.inputRequests.every((request) => request.asksForApprovalPhrase === false)).toBe(true);
    expect(report.inputRequests.every((request) => request.wouldAuthorizeSend === false)).toBe(true);
    expect(report.requestedHumanText.notApprovalFor).toContain("MailerLite send");
    expect(report.requestedHumanText.notApprovalFor).toContain("CRM write");
    expect(markdown).toContain("Pilot Distribution Input Request Packet");
    expect(markdown).toContain("Can ask final send approval now: false");
    expect(markdown).toContain("strategy_input_only_no_send");
    expect(report.safety).toMatchObject({
      localOnly: true,
      reportsOnly: true,
      mailerLiteApiCalled: false,
      subscribersRead: false,
      sendsPerformed: false,
      exactUrlsPrinted: false,
      recipientsPrinted: false,
      tokensPrinted: false,
    });
  });

  test("blocks the request when strategy evidence has drifted toward execution", () => {
    const report = buildReport({
      pilotDistributionStrategyPacket: {
        ...pilotDistributionStrategyPacket,
        executiveSummary: {
          ...pilotDistributionStrategyPacket.executiveSummary,
          canAskFinalSendApprovalNow: true,
        },
      },
    });

    expect(report.status).toBe("pilot_distribution_input_request_packet_blocked_missing_evidence_no_live_changes");
    expect(report.executiveSummary.inputRequestReady).toBe(false);
    expect(report.executiveSummary.canAskPilotLaneDecisionNow).toBe(false);
    expect(report.blockersBeforeInputRequestReady).toContain("pilot_distribution_strategy_not_ready");
  });

  test("keeps safety closed by default", () => {
    expect(buildSafety()).toMatchObject({
      localOnly: true,
      reportsOnly: true,
      mailerLiteApiCalled: false,
      shopifyApiCalled: false,
      crmLiveApiCalled: false,
      sendsPerformed: false,
      factStoreWritePerformed: false,
    });
  });
});
