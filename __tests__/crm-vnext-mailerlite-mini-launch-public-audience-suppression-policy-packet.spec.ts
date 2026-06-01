import { describe, expect, test } from "vitest";

import {
  buildPublicAudienceSuppressionPolicyPacket,
  buildPolicyRules,
  buildSafety,
  parseArgs,
  renderMarkdown,
  scanSafetyReady,
  summarizeCandidateGroups,
} from "../scripts/crm-vnext-mailerlite-mini-launch-public-audience-suppression-policy-packet.mjs";

const publicAudienceScanPacket = {
  ok: true,
  status: "public_audience_scan_packet_ready_read_only_no_mutations",
  launch: {
    resourceName: "Inteligencia para descansar",
    resourceType: "quiz",
  },
  executiveSummary: {
    freshAudienceScanReady: true,
    membershipScanReady: true,
    suppressionStatusScanReady: true,
    suppressionExclusionPolicyReady: false,
  },
  audienceScopeProgress: {
    remainingBlockers: [
      "exact_public_audience_scope_decision_missing",
      "public_audience_url_gate_not_ready",
      "suppression_exclusion_policy_missing",
      "current_drafts_point_only_to_empty_safety_group",
    ],
  },
  candidateAudienceGroups: [
    {
      name: "CC · Safety · Null audience · DO NOT SEND",
      existsInMailerLite: true,
      referencedByOptionIds: ["keep_null_audience_no_public_send"],
      apiActiveCount: 0,
      subscriberMembershipCountFromScan: 0,
      statusCounts: {
        active: 0,
        subscribed: 0,
        unsubscribed: 0,
        bounced: 0,
        unknown: 0,
        other: 0,
      },
      suppressionRiskCountFromScan: 0,
      exactSubscriberRowsPrinted: false,
      rawIdsPrinted: false,
      recipientsPrinted: false,
    },
    {
      name: "Onboarding complete",
      existsInMailerLite: true,
      referencedByOptionIds: ["existing_legacy_onboarding_complete_campaign_audience"],
      apiActiveCount: 933,
      subscriberMembershipCountFromScan: 1077,
      statusCounts: {
        active: 933,
        subscribed: 0,
        unsubscribed: 118,
        bounced: 26,
        unknown: 0,
        other: 0,
      },
      suppressionRiskCountFromScan: 144,
      exactSubscriberRowsPrinted: false,
      rawIdsPrinted: false,
      recipientsPrinted: false,
    },
  ],
  safety: {
    readOnly: true,
    mailerLiteApiCalled: true,
    mailerLiteGroupsRead: 90,
    mailerLiteSubscribersRead: 1373,
    mailerLiteMutationsPerformed: false,
    subscriberRowsPrinted: false,
    rawIdsPrinted: false,
    recipientsPrinted: false,
    tokensPrinted: false,
  },
};

const publicAudienceScopePacket = {
  ok: true,
  status: "public_audience_scope_packet_ready_blocked_no_live_changes",
  launch: {
    launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
    resourceName: "Inteligencia para descansar",
    resourceType: "quiz",
  },
  blockersBeforeScopeReady: [
    "exact_public_audience_scope_decision_missing",
    "public_audience_url_gate_not_ready",
    "suppression_exclusion_policy_missing",
    "current_drafts_point_only_to_empty_safety_group",
  ],
};

describe("CRM vNext MailerLite mini-launch public audience suppression policy packet", () => {
  test("normalizes args and defaults to local reports", () => {
    const parsed = parseArgs([
      "--public-audience-scan-packet",
      "/tmp/scan.json",
      "--public-audience-scope-packet",
      "/tmp/scope.json",
      "--out",
      "/tmp/policy.json",
      "--markdown-out",
      "/tmp/policy.md",
    ]);

    expect(parsed.publicAudienceScanPacket).toBe("/tmp/scan.json");
    expect(parsed.publicAudienceScopePacket).toBe("/tmp/scope.json");
    expect(parsed.out).toBe("/tmp/policy.json");
    expect(parsed.markdownOut).toBe("/tmp/policy.md");
  });

  test("turns a green read-only suppression scan into a conservative local exclusion policy", () => {
    const report = buildPublicAudienceSuppressionPolicyPacket({
      publicAudienceScanPacket,
      publicAudienceScopePacket,
      generatedAt: "2026-06-01T00:00:00.000Z",
    });
    const markdown = renderMarkdown(report);

    expect(report.ok).toBe(true);
    expect(report.status).toBe("public_audience_suppression_policy_packet_ready_no_live_changes");
    expect(report.executiveSummary.suppressionExclusionPolicyReady).toBe(true);
    expect(report.executiveSummary.publicAudienceScopeStillRequired).toBe(true);
    expect(report.executiveSummary.publicAudienceSendAllowedNow).toBe(false);
    expect(report.executiveSummary.liveActionAllowedNow).toBe(false);
    expect(report.executiveSummary.suppressionRiskMembershipCount).toBe(144);
    expect(report.audienceScopeProgress.resolvedBlockers).toEqual(["suppression_exclusion_policy_missing"]);
    expect(report.audienceScopeProgress.remainingBlockersAfterPolicy).not.toContain("suppression_exclusion_policy_missing");
    expect(report.audienceScopeProgress.remainingBlockersAfterPolicy).toContain("exact_public_audience_scope_decision_missing");
    expect(markdown).toContain("Suppression/exclusion policy ready: true");
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

  test("summarizes candidate groups without subscriber rows or raw ids", () => {
    expect(scanSafetyReady(publicAudienceScanPacket)).toBe(true);
    expect(summarizeCandidateGroups(publicAudienceScanPacket)).toEqual([
      expect.objectContaining({
        name: "CC · Safety · Null audience · DO NOT SEND",
        sendableMembershipCount: 0,
        suppressionRiskMembershipCount: 0,
        policyVerdict: "sendable_statuses_only_exclude_all_suppression_risk",
      }),
      expect.objectContaining({
        name: "Onboarding complete",
        sendableMembershipCount: 933,
        suppressionRiskMembershipCount: 144,
        exactSubscriberRowsPrinted: false,
      }),
    ]);
  });

  test("keeps the policy ready false when the scan leaked recipient detail", () => {
    const report = buildPublicAudienceSuppressionPolicyPacket({
      publicAudienceScanPacket: {
        ...publicAudienceScanPacket,
        safety: {
          ...publicAudienceScanPacket.safety,
          recipientsPrinted: true,
        },
      },
      publicAudienceScopePacket,
      generatedAt: "2026-06-01T00:00:00.000Z",
    });

    expect(report.status).toBe("public_audience_suppression_policy_packet_blocked_missing_scan_no_live_changes");
    expect(report.executiveSummary.suppressionExclusionPolicyReady).toBe(false);
    expect(report.audienceScopeProgress.resolvedBlockers).toEqual([]);
  });

  test("keeps safety closed by default and exposes fixed policy rules", () => {
    expect(buildPolicyRules().map((rule) => rule.id)).toContain("exclude_suppression_risk_statuses");
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
