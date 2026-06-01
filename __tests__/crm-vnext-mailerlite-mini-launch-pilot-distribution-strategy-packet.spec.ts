import { describe, expect, test } from "vitest";

import {
  buildPilotDistributionStrategyPacket,
  buildSafety,
  parseArgs,
  renderMarkdown,
} from "../scripts/crm-vnext-mailerlite-mini-launch-pilot-distribution-strategy-packet.mjs";

const launch = {
  launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
  resourceName: "Inteligencia para descansar",
  resourceType: "quiz",
};

const publicSendPreflightDecisionPacket = {
  ok: true,
  status: "public_send_preflight_decision_packet_ready_for_human_explanation_no_live_changes",
  launch,
  executiveSummary: {
    decisionExplanationReady: true,
    recommendedAudienceScopeId: "keep_null_audience_no_public_send",
    recommendedAudienceKnownActiveCount: 0,
    recommendedDistributionPath: "qa_then_manual_micro_cohort_or_opt_in_testers_before_any_broad_send",
    massSubscriberSendRecommendedNow: false,
    existingActiveSubscriberAudienceFutureOptionOnly: true,
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
      label: "Keep Null Audience",
      groupName: "CC · Safety · Null audience · DO NOT SEND",
      knownActiveCount: 0,
    },
    {
      id: "manual_micro_cohort",
      label: "Use exact micro-cohort",
      groupName: null,
      knownActiveCount: null,
    },
    {
      id: "opt_in_testers",
      label: "Use opt-in testers",
      groupName: null,
      knownActiveCount: null,
    },
    {
      id: "existing_legacy_onboarding_complete_campaign_audience",
      label: "Use existing practical campaign audience",
      groupName: "Onboarding complete",
      knownActiveCount: 933,
    },
  ],
};

const publicLaunchReadinessPacket = {
  ok: true,
  status: "mini_launch_public_launch_readiness_blocked_after_green_seed_qa_no_live_changes",
  launch,
  executiveSummary: {
    seedInboxQaGreen: true,
    readyForExactPublicSendApproval: false,
    liveActionAllowedNow: false,
  },
};

const cadenceBoard = {
  ok: true,
  status: "mini_launch_cadence_board_ready_no_live_changes",
  operatingRhythm: {
    activeCadenceNow: "weekly",
    every3DaysStatus: "designed_but_not_active",
  },
};

const buildReport = (overrides = {}) => buildPilotDistributionStrategyPacket({
  publicSendPreflightDecisionPacket,
  publicAudienceScopePacket,
  publicLaunchReadinessPacket,
  cadenceBoard,
  generatedAt: "2026-06-01T00:00:00.000Z",
  ...overrides,
});

describe("CRM vNext MailerLite mini-launch pilot distribution strategy packet", () => {
  test("normalizes args and defaults to local reports", () => {
    const parsed = parseArgs([
      "--public-send-preflight-decision-packet",
      "/tmp/preflight.json",
      "--public-audience-scope-packet",
      "/tmp/scope.json",
      "--public-launch-readiness-packet",
      "/tmp/readiness.json",
      "--cadence-board",
      "/tmp/cadence.json",
      "--out",
      "/tmp/strategy.json",
      "--markdown-out",
      "/tmp/strategy.md",
    ]);

    expect(parsed.publicSendPreflightDecisionPacket).toBe("/tmp/preflight.json");
    expect(parsed.publicAudienceScopePacket).toBe("/tmp/scope.json");
    expect(parsed.publicLaunchReadinessPacket).toBe("/tmp/readiness.json");
    expect(parsed.cadenceBoard).toBe("/tmp/cadence.json");
    expect(parsed.out).toBe("/tmp/strategy.json");
    expect(parsed.markdownOut).toBe("/tmp/strategy.md");
  });

  test("records a strategy-only decision boundary without opening sends or live mutations", () => {
    const report = buildReport();
    const markdown = renderMarkdown(report);

    expect(report.ok).toBe(true);
    expect(report.status).toBe("pilot_distribution_strategy_packet_ready_no_live_changes");
    expect(report.executiveSummary.strategyPacketReady).toBe(true);
    expect(report.executiveSummary.strategyDecisionReadyForExplanation).toBe(true);
    expect(report.executiveSummary.exactApprovalPhraseAvailable).toBe(false);
    expect(report.executiveSummary.finalSendPhraseAvailable).toBe(false);
    expect(report.executiveSummary.canAskFinalSendApprovalNow).toBe(false);
    expect(report.executiveSummary.canExecuteNow).toBe(false);
    expect(report.executiveSummary.liveActionAllowedNow).toBe(false);
    expect(report.executiveSummary.recommendedStrategyId)
      .toBe("keep_null_audience_then_micro_cohort_or_opt_in_before_broad_send");
    expect(report.executiveSummary.currentDefault).toBe("keep_null_audience_no_public_send");
    expect(report.executiveSummary.currentDefaultKnownActiveCount).toBe(0);
    expect(report.executiveSummary.nextLearningLanes).toEqual([
      "manual_micro_cohort_next",
      "opt_in_testers_next",
    ]);
    expect(report.executiveSummary.broadActiveSubscriberSendRecommendedNow).toBe(false);
    expect(report.executiveSummary.existingActiveSubscriberAudienceFutureOnly).toBe(true);
    expect(report.executiveSummary.existingActiveSubscriberAudienceKnownActiveCount).toBe(933);
    expect(report.executiveSummary.every3DaysCadenceActiveNow).toBe(false);
    expect(report.blockersBeforeStrategyReady).toEqual([]);
    expect(report.strategyOptions.map((option) => option.id)).toEqual([
      "keep_null_audience_no_public_send",
      "manual_micro_cohort_next",
      "opt_in_testers_next",
      "broad_existing_active_subscribers_future_only",
    ]);
    expect(report.strategyOptions.find((option) => option.id === "keep_null_audience_no_public_send"))
      .toMatchObject({
        posture: "selected_current_default",
        recommendedNow: true,
        knownActiveCount: 0,
        sendAllowedNow: false,
      });
    expect(report.strategyOptions.find((option) => option.id === "manual_micro_cohort_next")?.blockers)
      .toContain("exact_people_missing");
    expect(report.strategyOptions.find((option) => option.id === "opt_in_testers_next")?.blockers)
      .toContain("opt_in_tester_roster_missing");
    expect(report.strategyOptions.find((option) => option.id === "broad_existing_active_subscribers_future_only"))
      .toMatchObject({
        posture: "future_option_requires_separate_campaign_strategy_gate",
        recommendedNow: false,
        knownActiveCount: 933,
      });
    expect(report.decisionRecordTemplate).toMatchObject({
      decisionKind: "strategy_only_no_send",
      wouldAuthorizeLiveAction: false,
      wouldAuthorizeAudienceAssignment: false,
      wouldAuthorizeSend: false,
      wouldAuthorizeCrmWrite: false,
    });
    expect(report.blockedLiveBoundaries).toContain("public_or_audience_send");
    expect(report.blockedLiveBoundaries).toContain("CRM live writes");
    expect(markdown).toContain("Pilot Distribution Strategy Packet");
    expect(markdown).toContain("Broad active subscriber send recommended now: false");
    expect(markdown).toContain("Would authorize send: false");
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

  test("blocks the packet when preflight has drifted back toward a broad audience", () => {
    const report = buildReport({
      publicSendPreflightDecisionPacket: {
        ...publicSendPreflightDecisionPacket,
        executiveSummary: {
          ...publicSendPreflightDecisionPacket.executiveSummary,
          recommendedAudienceScopeId: "existing_legacy_onboarding_complete_campaign_audience",
          massSubscriberSendRecommendedNow: true,
        },
      },
    });

    expect(report.status).toBe("pilot_distribution_strategy_packet_blocked_missing_evidence_no_live_changes");
    expect(report.executiveSummary.strategyPacketReady).toBe(false);
    expect(report.blockersBeforeStrategyReady).toContain("public_send_preflight_not_pilot_aligned");
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
