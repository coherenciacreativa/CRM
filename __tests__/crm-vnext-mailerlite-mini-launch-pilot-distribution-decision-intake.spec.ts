import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

import {
  ALLOWED_LANES,
  buildPilotDistributionDecisionIntake,
  detectLane,
  parseArgs,
  renderMarkdown,
} from "../scripts/crm-vnext-mailerlite-mini-launch-pilot-distribution-decision-intake.mjs";

const inputRequestPacket = {
  status: "pilot_distribution_input_request_packet_ready_no_live_changes",
  launch: {
    launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
    resourceName: "Inteligencia para descansar",
    resourceType: "quiz",
  },
  executiveSummary: {
    inputRequestReady: true,
    canAskPilotLaneDecisionNow: true,
    canAskFinalSendApprovalNow: false,
    liveActionAllowedNow: false,
  },
  requestedHumanText: {
    notApprovalFor: [
      "MailerLite send",
      "audience assignment",
      "subscriber/group/segment mutation",
    ],
  },
};

const noDecision = {
  source: "none",
  raw: null,
  sourceStatus: {
    path: null,
    present: false,
    private: true,
    chars: 0,
    sha256: null,
    consultedFor: "test",
  },
};

const decision = (raw: string) => ({
  source: "cli_text",
  raw,
  sourceStatus: {
    path: null,
    present: true,
    private: true,
    chars: raw.length,
    sha256: "redacted-test-sha",
    consultedFor: "test",
  },
});

describe("CRM vNext MailerLite mini-launch pilot distribution decision intake", () => {
  test("normalizes args and prevents mixed decision sources", () => {
    const parsed = parseArgs([
      "--input-request-packet",
      "/tmp/input.json",
      "--decision-text",
      "manual_micro_cohort_next",
      "--out",
      "/tmp/out.json",
      "--markdown-out",
      "/tmp/out.md",
    ]);

    expect(parsed.inputRequestPacket).toBe("/tmp/input.json");
    expect(parsed.decisionText).toBe("manual_micro_cohort_next");
    expect(parsed.out).toBe("/tmp/out.json");
    expect(parsed.markdownOut).toBe("/tmp/out.md");
    expect(() => parseArgs(["--decision-text", "x", "--decision-file", "/tmp/x.txt"]))
      .toThrow("decision_text_and_file_are_mutually_exclusive");
  });

  test("waits without turning a missing lane decision into approval", () => {
    const report = buildPilotDistributionDecisionIntake({
      inputRequestPacket,
      decisionSource: noDecision,
      generatedAt: "2026-06-01T00:00:00.000Z",
    });

    expect(report.status).toBe("pilot_distribution_decision_intake_waiting_for_strategy_choice_no_live_changes");
    expect(report.executiveSummary).toMatchObject({
      inputRequestReady: true,
      decisionTextProvided: false,
      selectedPilotLane: null,
      laneDecisionReady: false,
      canAskFinalSendApprovalNow: false,
      liveActionAllowedNow: false,
      wouldAuthorizeSend: false,
      wouldAuthorizeAudienceAssignment: false,
    });
    expect(report.blockers).toContain("pilot_lane_strategy_decision_missing");
    expect(report.safety).toMatchObject({
      localOnly: true,
      decisionTextPrinted: false,
      mailerLiteApiCalled: false,
      sendsPerformed: false,
      liveApprovalGrantedByIntake: false,
    });
  });

  test("accepts a manual micro-cohort lane but marks roster as the next local-only requirement", () => {
    const report = buildPilotDistributionDecisionIntake({
      inputRequestPacket,
      decisionSource: decision("preparemos una micro-cohorte manual"),
      generatedAt: "2026-06-01T00:00:00.000Z",
    });

    expect(report.status).toBe("pilot_distribution_decision_intake_lane_selected_roster_needed_no_live_changes");
    expect(report.executiveSummary.selectedPilotLane).toBe("manual_micro_cohort_next");
    expect(report.executiveSummary.rosterRequiredNext).toBe(true);
    expect(report.executiveSummary.canAskFinalSendApprovalNow).toBe(false);
    expect(report.executiveSummary.wouldAuthorizeSend).toBe(false);
    expect(report.blockers).toContain("manual_micro_cohort_next_roster_needed_before_any_future_audience_step");
  });

  test("accepts keeping Null Audience as a closed strategy lane", () => {
    const report = buildPilotDistributionDecisionIntake({
      inputRequestPacket,
      decisionSource: decision("mantener null audience y sin envio"),
      generatedAt: "2026-06-01T00:00:00.000Z",
    });

    expect(report.status).toBe("pilot_distribution_decision_intake_lane_selected_no_live_changes");
    expect(report.executiveSummary.selectedPilotLane).toBe("keep_null_audience_no_public_send");
    expect(report.executiveSummary.rosterRequiredNext).toBe(false);
    expect(report.blockers).toEqual([]);
  });

  test("rejects ambiguous or unrecognized strategy text without printing the raw text", () => {
    const ambiguous = buildPilotDistributionDecisionIntake({
      inputRequestPacket,
      decisionSource: decision("micro cohorte y opt-in testers"),
      generatedAt: "2026-06-01T00:00:00.000Z",
    });
    const unrecognized = buildPilotDistributionDecisionIntake({
      inputRequestPacket,
      decisionSource: decision("hagamos algo luego"),
      generatedAt: "2026-06-01T00:00:00.000Z",
    });

    expect(ambiguous.status).toBe("pilot_distribution_decision_intake_ambiguous_choice_no_live_changes");
    expect(ambiguous.decisionIntake.matchedLaneIds).toEqual([
      "manual_micro_cohort_next",
      "opt_in_testers_next",
    ]);
    expect(unrecognized.status).toBe("pilot_distribution_decision_intake_unrecognized_choice_no_live_changes");
    expect(unrecognized.safety.decisionTextPrinted).toBe(false);
  });

  test("detects aliases and renders markdown without raw decision text", () => {
    expect(ALLOWED_LANES).toContain("opt_in_testers_next");
    expect(detectLane("sigamos con opt-in testers").selectedLaneId).toBe("opt_in_testers_next");

    const report = buildPilotDistributionDecisionIntake({
      inputRequestPacket,
      decisionSource: decision("sigamos con opt-in testers"),
      generatedAt: "2026-06-01T00:00:00.000Z",
    });
    const markdown = renderMarkdown(report);

    expect(markdown).toContain("Selected pilot lane: opt_in_testers_next");
    expect(markdown).not.toContain("sigamos con opt-in testers");
  });

  test("writes from file shape without requiring live actions", async () => {
    const dir = await mkdtemp(join(tmpdir(), "pilot-distribution-intake-"));
    const inputPath = join(dir, "input.json");
    const decisionPath = join(dir, "decision.txt");
    await writeFile(inputPath, `${JSON.stringify(inputRequestPacket)}\n`);
    await writeFile(decisionPath, "manual_micro_cohort_next\n");

    const parsed = parseArgs([
      "--input-request-packet",
      inputPath,
      "--decision-file",
      decisionPath,
    ]);

    expect(parsed.decisionFile).toBe(decisionPath);
  });
});
