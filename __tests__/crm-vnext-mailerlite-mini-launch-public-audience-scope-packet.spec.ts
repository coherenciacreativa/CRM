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

describe("CRM vNext MailerLite mini-launch public audience scope packet", () => {
  test("normalizes args and defaults to local reports", () => {
    const parsed = parseArgs([
      "--mini-launch-os-packet",
      "/tmp/os.json",
      "--shopify-public-url-gate",
      "/tmp/url.json",
      "--out",
      "/tmp/scope.json",
      "--markdown-out",
      "/tmp/scope.md",
    ]);

    expect(parsed.miniLaunchOsPacket).toBe("/tmp/os.json");
    expect(parsed.shopifyPublicUrlGate).toBe("/tmp/url.json");
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
    expect(report.blockersBeforeScopeReady).toContain("exact_public_audience_scope_decision_missing");
    expect(report.blockersBeforeScopeReady).toContain("public_audience_url_gate_not_ready");
    expect(report.blockersBeforeScopeReady).toContain("current_drafts_point_only_to_empty_safety_group");
    expect(report.audienceScopeOptions.map((option) => option.id)).toEqual([
      "keep_null_audience_no_public_send",
      "existing_legacy_onboarding_complete_campaign_audience",
      "future_general_newsletter_eligible",
      "future_mini_launches_eligible",
      "manual_micro_cohort",
    ]);
    expect(report.audienceScopeOptions.find((option) => option.id === "existing_legacy_onboarding_complete_campaign_audience")).toMatchObject({
      groupName: "Onboarding complete",
      knownActiveCount: 933,
      publicSendReadyNow: false,
    });
    expect(markdown).toContain("Public/audience scope ready: false");
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
