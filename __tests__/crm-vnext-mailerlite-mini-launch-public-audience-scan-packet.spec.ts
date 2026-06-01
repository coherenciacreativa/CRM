import { describe, expect, test } from "vitest";

import {
  buildCandidateSummaries,
  buildPublicAudienceScanPacket,
  buildSafety,
  candidateGroupNamesFromScope,
  parseArgs,
  renderMarkdown,
} from "../scripts/crm-vnext-mailerlite-mini-launch-public-audience-scan-packet.mjs";

const publicAudienceScopePacket = {
  ok: true,
  status: "public_audience_scope_packet_ready_blocked_no_live_changes",
  launch: {
    launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
    resourceName: "Inteligencia para descansar",
    resourceType: "quiz",
  },
  executiveSummary: {
    currentSafetyGroupName: "CC · Safety · Null audience · DO NOT SEND",
  },
  audienceScopeOptions: [
    {
      id: "keep_null_audience_no_public_send",
      groupName: "CC · Safety · Null audience · DO NOT SEND",
    },
    {
      id: "existing_legacy_onboarding_complete_campaign_audience",
      groupName: "Onboarding complete",
    },
    {
      id: "future_general_newsletter_eligible",
      groupName: "CC · Audience · General newsletter · Eligible",
    },
  ],
  blockersBeforeScopeReady: [
    "exact_public_audience_scope_decision_missing",
    "public_audience_url_gate_not_ready",
    "fresh_audience_membership_scan_missing",
    "suppression_exclusion_policy_missing",
    "current_drafts_point_only_to_empty_safety_group",
  ],
};

const liveGroups = [
  { id: "hidden-safety", name: "CC · Safety · Null audience · DO NOT SEND", active_count: 0 },
  { id: "hidden-onboarding", name: "Onboarding complete", active_count: 2 },
  { id: "hidden-future", name: "CC · Audience · General newsletter · Eligible", active_count: 0 },
];

const subscriberScan = {
  pages: 1,
  exhaustedByCap: false,
  subscribers: [
    {
      id: "sub-1",
      email: "person1@example.com",
      status: "active",
      groups: [{ id: "hidden-onboarding", name: "Onboarding complete" }],
    },
    {
      id: "sub-2",
      email: "person2@example.com",
      status: "unsubscribed",
      groups: [{ id: "hidden-onboarding", name: "Onboarding complete" }],
    },
    {
      id: "sub-3",
      email: "person3@example.com",
      status: "active",
      groups: [{ id: "other", name: "Other group" }],
    },
  ],
};

describe("CRM vNext MailerLite mini-launch public audience scan packet", () => {
  test("normalizes args for a read-only aggregate scan", () => {
    const parsed = parseArgs([
      "--public-audience-scope-packet",
      "/tmp/scope.json",
      "--limit",
      "250",
      "--out",
      "/tmp/scan.json",
      "--markdown-out",
      "/tmp/scan.md",
    ]);

    expect(parsed.publicAudienceScopePacket).toBe("/tmp/scope.json");
    expect(parsed.limit).toBe(100);
    expect(parsed.out).toBe("/tmp/scan.json");
    expect(parsed.markdownOut).toBe("/tmp/scan.md");
  });

  test("extracts candidate group names from the public audience scope packet", () => {
    expect(candidateGroupNamesFromScope(publicAudienceScopePacket)).toEqual([
      "CC · Safety · Null audience · DO NOT SEND",
      "Onboarding complete",
      "CC · Audience · General newsletter · Eligible",
    ]);
  });

  test("aggregates candidate group memberships without exposing subscriber rows or raw ids", () => {
    const summaries = buildCandidateSummaries({
      publicAudienceScopePacket,
      liveGroups,
      subscribers: subscriberScan.subscribers,
    });

    const onboarding = summaries.candidateGroups.find((group) => group.name === "Onboarding complete");
    expect(summaries.subscribersMatchedToCandidateGroups).toBe(2);
    expect(onboarding).toMatchObject({
      existsInMailerLite: true,
      groupIdKnown: true,
      apiActiveCount: 2,
      subscriberMembershipCountFromScan: 2,
      suppressionRiskCountFromScan: 1,
      exactSubscriberRowsPrinted: false,
      rawIdsPrinted: false,
      recipientsPrinted: false,
    });
    expect(onboarding?.statusCounts.active).toBe(1);
    expect(onboarding?.statusCounts.unsubscribed).toBe(1);
  });

  test("marks the fresh audience scan ready but keeps policy and send gates closed", () => {
    const report = buildPublicAudienceScanPacket({
      publicAudienceScopePacket,
      liveGroups,
      subscriberScan,
      generatedAt: "2026-06-01T00:00:00.000Z",
    });
    const markdown = renderMarkdown(report);

    expect(report.ok).toBe(true);
    expect(report.status).toBe("public_audience_scan_packet_ready_read_only_no_mutations");
    expect(report.executiveSummary.freshAudienceScanReady).toBe(true);
    expect(report.executiveSummary.membershipScanReady).toBe(true);
    expect(report.executiveSummary.suppressionStatusScanReady).toBe(true);
    expect(report.executiveSummary.suppressionExclusionPolicyReady).toBe(false);
    expect(report.audienceScopeProgress.resolvedBlockers).toEqual(["fresh_audience_membership_scan_missing"]);
    expect(report.audienceScopeProgress.remainingBlockers).not.toContain("fresh_audience_membership_scan_missing");
    expect(report.audienceScopeProgress.remainingBlockers).toContain("suppression_exclusion_policy_missing");
    expect(markdown).toContain("No public or audience send.");
    expect(report.safety).toMatchObject({
      readOnly: true,
      mailerLiteApiCalled: false,
      mailerLiteGroupsRead: 3,
      mailerLiteSubscribersRead: 3,
      subscriberRowsPrinted: false,
      rawIdsPrinted: false,
      recipientsPrinted: false,
      tokensPrinted: false,
    });
  });

  test("keeps mutation safety closed", () => {
    expect(buildSafety({ mailerLiteApiCalled: true, groupsRead: 3, subscribersRead: 10 })).toMatchObject({
      readOnly: true,
      mailerLiteApiCalled: true,
      mailerLiteMutationsPerformed: false,
      subscriberRowsPrinted: false,
      subscriberMutationsPerformed: false,
      groupMutationsPerformed: false,
      sendsPerformed: false,
      tokensPrinted: false,
    });
  });
});
