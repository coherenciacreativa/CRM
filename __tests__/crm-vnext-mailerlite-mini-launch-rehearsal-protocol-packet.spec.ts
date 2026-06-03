import { describe, expect, test } from "vitest";

import {
  buildRehearsalProtocolPacket,
  buildSafety,
  parseArgs,
  renderMarkdown,
  safetyClosed,
} from "../scripts/crm-vnext-mailerlite-mini-launch-rehearsal-protocol-packet.mjs";

const launch = {
  launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
  resourceName: "Inteligencia para descansar",
  resourceType: "quiz",
};

const decisionIntake = {
  status: "pilot_distribution_decision_intake_lane_selected_no_live_changes",
  launch,
  executiveSummary: {
    selectedPilotLane: "keep_null_audience_no_public_send",
    laneDecisionReady: true,
    rosterRequiredNext: false,
    canAskFinalSendApprovalNow: false,
    liveActionAllowedNow: false,
    wouldAuthorizeSend: false,
    blockerCount: 0,
  },
};

const siboReviewPacket = {
  status: "sibo_review_packet_no_send_ready_no_live_changes",
  launch,
  executiveSummary: {
    reviewPacketReady: true,
    recommendedStrategyChoice: "keep_null_audience_no_public_send",
    liveActionAllowedNow: false,
    wouldAuthorizeSend: false,
    blockerCount: 0,
  },
};

const standingDelegationPolicyDigest = {
  path: "/tmp/launch-os-standing-delegation-policy.md",
  present: true,
  private: false,
  chars: 100,
  sha256: "redacted-test-sha",
  consultedFor: "test",
};

const buildReport = (overrides = {}) => buildRehearsalProtocolPacket({
  decisionIntake,
  siboReviewPacket,
  standingDelegationPolicyDigest,
  generatedAt: "2026-06-03T00:00:00.000Z",
  ...overrides,
});

describe("CRM vNext MailerLite mini-launch rehearsal protocol packet", () => {
  test("parses explicit inputs", () => {
    const parsed = parseArgs([
      "--decision-intake",
      "/tmp/intake.json",
      "--sibo-review-packet",
      "/tmp/sibo.json",
      "--standing-delegation-policy",
      "/tmp/policy.md",
      "--out",
      "/tmp/out.json",
      "--markdown-out",
      "/tmp/out.md",
    ]);

    expect(parsed.decisionIntake).toBe("/tmp/intake.json");
    expect(parsed.siboReviewPacket).toBe("/tmp/sibo.json");
    expect(parsed.standingDelegationPolicy).toBe("/tmp/policy.md");
    expect(parsed.out).toBe("/tmp/out.json");
    expect(parsed.markdownOut).toBe("/tmp/out.md");
  });

  test("builds a no-send rehearsal protocol from lane decision and SIBO evidence", () => {
    const report = buildReport();
    const markdown = renderMarkdown(report);

    expect(report.status).toBe("launch_rehearsal_protocol_no_send_ready_local_only");
    expect(report.executiveSummary).toMatchObject({
      protocolReady: true,
      selectedPilotLane: "keep_null_audience_no_public_send",
      decisionIntakeReady: true,
      siboReviewReady: true,
      standingDelegationRecorded: true,
      standingSeedTestDelegationAvailable: true,
      firstRunCanSendNow: false,
      freshPreflightRequiredBeforeAnySeedSend: true,
      publicAudienceSendAuthorized: false,
      liveActionAllowedNow: false,
      wouldAuthorizeSend: false,
      wouldAuthorizeAudienceAssignment: false,
      blockerCount: 0,
    });
    expect(report.protocol.stages.map((stage) => stage.id)).toContain("delegated_seed_test_if_green");
    expect(report.protocol.requiredEvidenceBeforeDelegatedSeedRun).toContain("Null Audience active_count=0");
    expect(report.notApprovalFor).toContain("public/audience send");
    expect(markdown).toContain("Launch Rehearsal Protocol No-Send");
    expect(markdown).toContain("First run can send now: false");
    expect(safetyClosed(report.safety)).toBe(true);
  });

  test("blocks if the selected lane is no longer keep Null Audience", () => {
    const report = buildReport({
      decisionIntake: {
        ...decisionIntake,
        executiveSummary: {
          ...decisionIntake.executiveSummary,
          selectedPilotLane: "manual_micro_cohort_next",
        },
      },
    });

    expect(report.status).toBe("launch_rehearsal_protocol_no_send_blocked_missing_evidence_local_only");
    expect(report.executiveSummary.protocolReady).toBe(false);
    expect(report.executiveSummary.blockers).toContain("decision_intake_not_no_send_ready");
    expect(report.executiveSummary.liveActionAllowedNow).toBe(false);
  });

  test("keeps live safety closed by default", () => {
    expect(buildSafety()).toMatchObject({
      localOnly: true,
      reportsOnly: true,
      mailerLiteApiCalled: false,
      mailerLiteUiUsed: false,
      sendsPerformed: false,
      publicAudienceSendAuthorized: false,
      shopifyApiCalled: false,
      crmLiveApiCalled: false,
      factStoreWritePerformed: false,
    });
  });
});
