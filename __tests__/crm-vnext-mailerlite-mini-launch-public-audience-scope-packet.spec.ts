import { describe, expect, test } from "vitest";

import {
  buildPublicAudienceScopePacket,
  buildSafety,
  parseArgs,
  renderMarkdown,
} from "../scripts/crm-vnext-mailerlite-mini-launch-public-audience-scope-packet.mjs";

const miniLaunchOsPacket = {
  launch: {
    launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
    resourceName: "Inteligencia para descansar",
    resourceType: "quiz",
  },
  receiptPlan: {
    audienceCandidate: "CC · Audience · Mini-launches · Eligible",
  },
};

const miniLaunchPathPacket = {
  taxonomy: {
    audienceImplication: {
      possibleFuture: "CC · Audience · Mini-launches · Eligible",
    },
  },
};

const onboardingTrunkMap = {
  executiveSummary: {
    currentAudienceGroup: "Onboarding complete",
    currentAudienceActiveCount: 933,
    futureHandoffTarget: "CC · Journey · Editorial onboarding · Eligible",
  },
};

const onboardingV2DesignPacket = {
  workflowBlueprint: {
    completionActions: [
      {
        action: "mark_general_newsletter_eligible",
        group: { name: "CC · Audience · General newsletter · Eligible" },
      },
    ],
  },
};

const onboardingHandoffPolicy = {
  targetGroups: {
    eligible: "CC · Journey · Editorial onboarding · Eligible",
    audienceEligible: "CC · Audience · General newsletter · Eligible",
  },
};

const miniLaunchGroupDryRun = {
  launch: {
    launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
    resourceName: "Inteligencia para descansar",
    resourceType: "quiz",
    sourceGroupCandidate: "CC · Source · Quiz · Inteligencia para descansar",
    deliveredGroupCandidate: "CC · Delivered · Quiz result · Inteligencia para descansar",
  },
  plannedGroups: [
    { name: "CC · Source · Quiz · Inteligencia para descansar", activeCount: 0 },
    { name: "CC · Delivered · Quiz result · Inteligencia para descansar", activeCount: 0 },
  ],
};

const nullAudienceReplacementExecutionReceipt = {
  preflight: {
    safetyGroupName: "CC · Safety · Null audience · DO NOT SEND",
    safetyGroupActiveCount: 0,
  },
};

const nullAudienceSeedInboxQa = {
  status: "mailerlite_null_audience_seed_inbox_qa_completed_green_no_live_changes",
  deliverySummary: {
    seedInboxQaGreen: true,
  },
};

const shopifyPublicUrlGate = {
  executiveSummary: {
    publicAudienceSendUrlGateReady: false,
  },
};

const publicAudienceScanPacket = {
  ok: true,
  status: "public_audience_scan_packet_ready_read_only_no_mutations",
  executiveSummary: {
    freshAudienceScanReady: true,
    suppressionStatusScanReady: true,
    suppressionExclusionPolicyReady: false,
    candidateGroupCount: 3,
    subscribersScanned: 933,
    subscribersMatchedToCandidateGroups: 933,
  },
  candidateAudienceGroups: [
    {
      name: "CC · Safety · Null audience · DO NOT SEND",
      apiActiveCount: 0,
    },
    {
      name: "Onboarding complete",
      apiActiveCount: 933,
    },
  ],
  safety: {
    readOnly: true,
    subscriberRowsPrinted: false,
    rawIdsPrinted: false,
    recipientsPrinted: false,
    tokensPrinted: false,
  },
};

const publicAudienceSuppressionPolicyPacket = {
  ok: true,
  status: "public_audience_suppression_policy_packet_ready_no_live_changes",
  executiveSummary: {
    suppressionExclusionPolicyReady: true,
    policyRuleCount: 6,
    suppressionRiskMembershipCount: 144,
    remainingBlockerCountAfterPolicy: 3,
  },
  safety: {
    mailerLiteApiCalled: false,
    subscribersRead: false,
    subscriberRowsPrinted: false,
    rawIdsPrinted: false,
    recipientsPrinted: false,
    tokensPrinted: false,
  },
};

describe("CRM vNext MailerLite mini-launch public audience scope packet", () => {
  test("normalizes args and defaults to local reports", () => {
    const parsed = parseArgs([
      "--mini-launch-os-packet",
      "/tmp/os.json",
      "--shopify-public-url-gate",
      "/tmp/url.json",
      "--public-audience-suppression-policy-packet",
      "/tmp/policy.json",
      "--out",
      "/tmp/scope.json",
      "--markdown-out",
      "/tmp/scope.md",
    ]);

    expect(parsed.miniLaunchOsPacket).toBe("/tmp/os.json");
    expect(parsed.shopifyPublicUrlGate).toBe("/tmp/url.json");
    expect(parsed.publicAudienceSuppressionPolicyPacket).toBe("/tmp/policy.json");
    expect(parsed.out).toBe("/tmp/scope.json");
    expect(parsed.markdownOut).toBe("/tmp/scope.md");
  });

  test("turns missing public audience scope into explicit local-only options without approval or mutation", () => {
    const report = buildPublicAudienceScopePacket({
      miniLaunchOsPacket,
      miniLaunchPathPacket,
      onboardingTrunkMap,
      onboardingV2DesignPacket,
      onboardingHandoffPolicy,
      miniLaunchGroupDryRun,
      nullAudienceReplacementExecutionReceipt,
      nullAudienceSeedInboxQa,
      shopifyPublicUrlGate,
      generatedAt: "2026-06-01T00:00:00.000Z",
    });
    const markdown = renderMarkdown(report);

    expect(report.ok).toBe(true);
    expect(report.status).toBe("public_audience_scope_packet_ready_blocked_no_live_changes");
    expect(report.executiveSummary.audienceScopePacketReady).toBe(true);
    expect(report.executiveSummary.seedInboxQaGreen).toBe(true);
    expect(report.executiveSummary.currentDraftAudience).toBe("null_audience_safety_group_only");
    expect(report.executiveSummary.currentSafetyGroupActiveCount).toBe(0);
    expect(report.executiveSummary.publicAudienceScopeReady).toBe(false);
    expect(report.executiveSummary.readyForExactAudienceScopeApproval).toBe(false);
    expect(report.executiveSummary.canAskAudienceScopeApprovalNow).toBe(false);
    expect(report.executiveSummary.recommendedDefaultNow).toBe("keep_null_audience_no_public_send");
    expect(report.executiveSummary.recommendedFutureDecisionPath)
      .toBe("qa_then_manual_micro_cohort_or_opt_in_testers_before_any_broad_subscriber_send");
    expect(report.executiveSummary.massSubscriberSendRecommendedNow).toBe(false);
    expect(report.executiveSummary.existingActiveSubscriberAudienceFutureOptionOnly).toBe(true);
    expect(report.executiveSummary.currentDraftsRemainInertUntilExactApproval).toBe(true);
    expect(report.blockersBeforeScopeReady).toContain("exact_public_audience_scope_decision_missing");
    expect(report.blockersBeforeScopeReady).toContain("public_audience_url_gate_not_ready");
    expect(report.blockersBeforeScopeReady).not.toContain("current_drafts_point_only_to_empty_safety_group");
    expect(report.audienceAssignmentExecutionBlockers).toContain("current_drafts_point_only_to_empty_safety_group");
    expect(report.scopeReadinessPolicy).toMatchObject({
      nullAudienceDraftsAreExecutionBoundary: true,
      exactScopeDecisionDoesNotMutateDrafts: true,
      audienceAssignmentRequiresExactExecutionApproval: true,
    });
    expect(report.audienceScopeOptions.map((option) => option.id)).toEqual([
      "keep_null_audience_no_public_send",
      "existing_legacy_onboarding_complete_campaign_audience",
      "future_general_newsletter_eligible",
      "future_mini_launches_eligible",
      "manual_micro_cohort",
      "opt_in_testers",
    ]);
    expect(report.audienceScopeOptions.find((option) => option.id === "existing_legacy_onboarding_complete_campaign_audience")).toMatchObject({
      posture: "future_option_requires_campaign_strategy_gate",
      groupName: "Onboarding complete",
      knownActiveCount: 933,
      publicSendReadyNow: false,
    });
    expect(
      report.audienceScopeOptions.find((option) => option.id === "existing_legacy_onboarding_complete_campaign_audience")?.blockers,
    ).toContain("campaign_strategy_gate_missing");
    expect(report.audienceScopeOptions.find((option) => option.id === "manual_micro_cohort")).toMatchObject({
      recommendedFor: "default market-learning pilot after seed QA if exact people are available",
    });
    expect(report.audienceScopeOptions.find((option) => option.id === "opt_in_testers")).toMatchObject({
      posture: "candidate_requires_opt_in_roster",
    });
    expect(markdown).toContain("Public/audience scope ready: false");
    expect(markdown).toContain("Mass subscriber send recommended now: false");
    expect(markdown).toContain("No public or audience send.");
    expect(report.safety).toMatchObject({
      localOnly: true,
      reportsOnly: true,
      mailerLiteApiCalled: false,
      subscribersRead: false,
      subscriberRowsPrinted: false,
      sendsPerformed: false,
      rawIdsPrinted: false,
      recipientsPrinted: false,
    });
  });

  test("consumes the aggregate read-only audience scan and resolves only the fresh-scan blocker", () => {
    const report = buildPublicAudienceScopePacket({
      miniLaunchOsPacket,
      miniLaunchPathPacket,
      onboardingTrunkMap,
      onboardingV2DesignPacket,
      onboardingHandoffPolicy,
      miniLaunchGroupDryRun,
      nullAudienceReplacementExecutionReceipt,
      nullAudienceSeedInboxQa,
      shopifyPublicUrlGate,
      publicAudienceScanPacket,
      generatedAt: "2026-06-01T00:00:00.000Z",
    });

    expect(report.executiveSummary.freshAudienceScanReady).toBe(true);
    expect(report.executiveSummary.suppressionStatusScanReady).toBe(true);
    expect(report.executiveSummary.suppressionExclusionPolicyReady).toBe(false);
    expect(report.blockersBeforeScopeReady).not.toContain("fresh_audience_membership_scan_missing");
    expect(report.blockersBeforeScopeReady).toContain("suppression_exclusion_policy_missing");
    expect(report.blockersBeforeScopeReady).toContain("public_audience_url_gate_not_ready");
    expect(report.currentSafeState.aggregateScanReport).toMatchObject({
      status: "public_audience_scan_packet_ready_read_only_no_mutations",
      subscribersScanned: 933,
      subscribersMatchedToCandidateGroups: 933,
    });
    expect(
      report.audienceScopeOptions.find((option) => option.id === "existing_legacy_onboarding_complete_campaign_audience"),
    ).toMatchObject({
      knownActiveCount: 933,
    });
  });

  test("keeps scope blocked when the current Null Audience replacement execution receipt is pending", () => {
    const report = buildPublicAudienceScopePacket({
      miniLaunchOsPacket,
      miniLaunchPathPacket,
      onboardingTrunkMap,
      onboardingV2DesignPacket,
      onboardingHandoffPolicy,
      miniLaunchGroupDryRun,
      nullAudienceReplacementExecutionReceipt: null,
      nullAudienceSeedInboxQa,
      shopifyPublicUrlGate,
      publicAudienceScanPacket,
      publicAudienceSuppressionPolicyPacket,
      generatedAt: "2026-06-02T00:00:00.000Z",
    });

    expect(report.ok).toBe(true);
    expect(report.status).toBe("public_audience_scope_packet_ready_blocked_no_live_changes");
    expect(report.executiveSummary.currentDraftAudience).toBe("null_audience_safety_group_only");
    expect(report.executiveSummary.currentSafetyGroupName).toBe("CC · Safety · Null audience · DO NOT SEND");
    expect(report.executiveSummary.currentSafetyGroupActiveCount).toBe(0);
    expect(report.executiveSummary.publicAudienceScopeReady).toBe(false);
    expect(report.executiveSummary.canAskAudienceScopeApprovalNow).toBe(false);
    expect(report.executiveSummary.massSubscriberSendRecommendedNow).toBe(false);
    expect(report.audienceAssignmentExecutionBlockers).toContain("current_drafts_point_only_to_empty_safety_group");
    expect(report.safety).toMatchObject({
      mailerLiteApiCalled: false,
      mailerLiteMutationsPerformed: false,
      sendsPerformed: false,
      rawIdsPrinted: false,
      recipientsPrinted: false,
      tokensPrinted: false,
    });
  });

  test("consumes a local suppression policy packet and removes only that policy blocker", () => {
    const report = buildPublicAudienceScopePacket({
      miniLaunchOsPacket,
      miniLaunchPathPacket,
      onboardingTrunkMap,
      onboardingV2DesignPacket,
      onboardingHandoffPolicy,
      miniLaunchGroupDryRun,
      nullAudienceReplacementExecutionReceipt,
      nullAudienceSeedInboxQa,
      shopifyPublicUrlGate,
      publicAudienceScanPacket,
      publicAudienceSuppressionPolicyPacket,
      generatedAt: "2026-06-01T00:00:00.000Z",
    });

    expect(report.executiveSummary.freshAudienceScanReady).toBe(true);
    expect(report.executiveSummary.suppressionStatusScanReady).toBe(true);
    expect(report.executiveSummary.suppressionExclusionPolicyReady).toBe(true);
    expect(report.blockersBeforeScopeReady).not.toContain("fresh_audience_membership_scan_missing");
    expect(report.blockersBeforeScopeReady).not.toContain("suppression_exclusion_policy_missing");
    expect(report.blockersBeforeScopeReady).toEqual([
      "exact_public_audience_scope_decision_missing",
      "public_audience_url_gate_not_ready",
    ]);
    expect(report.audienceAssignmentExecutionBlockers).toEqual(["current_drafts_point_only_to_empty_safety_group"]);
    expect(report.currentSafeState.suppressionPolicyReport).toMatchObject({
      status: "public_audience_suppression_policy_packet_ready_no_live_changes",
      suppressionExclusionPolicyReady: true,
      policyRuleCount: 6,
      suppressionRiskMembershipCount: 144,
    });
    expect(
      report.audienceScopeOptions.find((option) => option.id === "existing_legacy_onboarding_complete_campaign_audience")?.blockers,
    ).not.toContain("suppression_exclusion_policy_missing");
    expect(
      report.audienceScopeOptions.find((option) => option.id === "existing_legacy_onboarding_complete_campaign_audience")?.blockers,
    ).toContain("campaign_strategy_gate_missing");
  });

  test("keeps safety closed by default", () => {
    expect(buildSafety()).toMatchObject({
      localOnly: true,
      reportsOnly: true,
      mailerLiteApiCalled: false,
      crmLiveApiCalled: false,
      subscribersRead: false,
      sendsPerformed: false,
      factStoreWritePerformed: false,
    });
  });
});
