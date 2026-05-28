import { describe, expect, test } from "vitest";

import {
  buildMissingInputsIntake,
  buildObservedState,
  buildSeedState,
  parseArgs,
  redactEmail,
  renderMarkdown,
  summarizeFactReview,
  summarizeObservedEvents,
} from "../scripts/crm-vnext-mailerlite-launch-os-missing-inputs-intake.mjs";

const missingInputsKit = {
  status: "missing_inputs_kit_ready_no_live_changes",
  inputRequests: [
    {
      id: "exact_seed_recipient",
      gateId: "mini_launch_seed_send",
      approvalEffect: "does_not_approve_send_or_execution",
      nextLocalCommandAfterInput: "npm run seed -- --seed-email-file /tmp/private/seed.txt",
    },
    {
      id: "real_observed_events_file",
      gateId: "crm_signal_writes",
      approvalEffect: "does_not_approve_crm_writes",
      nextLocalCommandAfterInput: "npm run crm -- --observed-events-file /tmp/private/events.json",
    },
    {
      id: "exact_people",
      gateId: "crm_signal_writes",
      approvalEffect: "does_not_approve_crm_writes",
    },
    {
      id: "writable_event_screen",
      gateId: "crm_signal_writes",
      approvalEffect: "does_not_approve_crm_writes",
    },
    {
      id: "fact_store_market_review",
      gateId: "crm_signal_writes",
      approvalEffect: "does_not_approve_fact_store_write",
    },
  ],
};

const operatorRunbook = {
  currentState: {
    miniLaunch: {
      currentPilot: {
        launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
        resourceName: "Inteligencia para descansar",
        resourceType: "quiz",
      },
    },
  },
};

const crmWriteApprovalPacket = {
  launch: {
    launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
    resourceName: "Inteligencia para descansar",
    resourceType: "quiz",
  },
};

const validObservedEventsPayload = {
  events: [
    {
      eventKind: "quiz_started",
      sourceKind: "mailerlite_mini_launch",
      channel: "email",
      sourceId: "campaign-1",
      observedAt: "2026-05-28T00:00:00.000Z",
      metrics: {
        launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
      },
      email: "private.person@example.com",
      evidenceSourcePath: "/Users/example/private/events.json",
    },
    {
      eventKind: "quiz_result_delivered",
      sourceKind: "mailerlite_mini_launch",
      channel: "email",
      sourceId: "campaign-2",
      observedAt: "2026-05-28T00:05:00.000Z",
      metrics: {
        launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
      },
      instagramHandle: "@private_handle",
      evidenceSourcePath: "/Users/example/private/events.json",
    },
  ],
  factStoreMarketReview: {
    reviewed: true,
    facts: [
      {
        factKind: "aggregate_launch_signal",
        summary: "Two exact observed events are ready for review.",
        evidenceEventIds: ["evt-1", "evt-2"],
      },
    ],
  },
};

describe("CRM vNext MailerLite Launch OS missing-inputs intake", () => {
  test("normalizes default args and private paths", () => {
    const parsed = parseArgs([
      "--seed-email-file",
      "/tmp/private/seed.txt",
      "--observed-events-file",
      "/tmp/private/events.json",
      "--out",
      "/tmp/intake.json",
      "--markdown-out",
      "/tmp/intake.md",
    ]);

    expect(parsed.missingInputsKit).toContain("mailerlite_launch_os_missing_inputs_kit_2026-05-28.json");
    expect(parsed.operatorRunbook).toContain("mailerlite_launch_os_operator_runbook_2026-05-28.json");
    expect(parsed.crmWriteApprovalPacket).toContain("mailerlite_mini_launch_crm_write_approval_packet_inteligencia_descansar_2026-05-28.json");
    expect(parsed.seedEmailFile).toBe("/tmp/private/seed.txt");
    expect(parsed.observedEventsFile).toBe("/tmp/private/events.json");
    expect(parsed.out).toBe("/tmp/intake.json");
    expect(parsed.markdownOut).toBe("/tmp/intake.md");
  });

  test("reports all inputs missing without asking approval or creating private files", () => {
    const report = buildMissingInputsIntake({
      missingInputsKit,
      operatorRunbook,
      crmWriteApprovalPacket,
      seedEmailRead: { present: false, content: null, error: null },
      seedEmailFile: "/tmp/private/seed.txt",
      observedEventsRead: { present: false, value: null, error: null, chars: 0 },
      observedEventsFile: "/tmp/private/events.json",
      generatedAt: "2026-05-28T00:00:00.000Z",
    });

    expect(report.status).toBe("missing_inputs_intake_waiting_for_inputs_no_live_changes");
    expect(report.executiveSummary.readyInputCount).toBe(0);
    expect(report.executiveSummary.presentInputCount).toBe(0);
    expect(report.executiveSummary.canAskApprovalNow).toBe(false);
    expect(report.executiveSummary.nextSafeAction).toBe("collect_missing_inputs_without_approval_or_execution");
    expect(report.safety).toMatchObject({
      createsPrivateFiles: false,
      asksApproval: false,
      mailerLiteApiCalled: false,
      crmLiveApiCalled: false,
      sendsPerformed: false,
      exactPrivateValuesPrinted: false,
    });
  });

  test("validates and redacts exact seed recipient", () => {
    const state = buildSeedState({
      path: "/tmp/private/seed.txt",
      read: {
        present: true,
        content: "seed.person@example.com\n",
        error: null,
      },
    });

    expect(state.status).toBe("ready_redacted_no_live_changes");
    expect(state.valid).toBe(true);
    expect(state.redactedEmail).toBe("se...@e....com");
    expect(state.sha256).toHaveLength(64);
    expect(state.exactValueStoredInReport).toBe(false);
    expect(JSON.stringify(state)).not.toContain("seed.person@example.com");
    expect(redactEmail("abraham@example.com")).toBe("ab...@e....com");
  });

  test("summarizes observed events without storing exact people", () => {
    const summary = summarizeObservedEvents({
      payload: validObservedEventsPayload,
      launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
    });
    const observedState = buildObservedState({
      path: "/tmp/private/events.json",
      read: {
        present: true,
        value: validObservedEventsPayload,
        error: null,
        chars: 100,
      },
      launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
    });

    expect(summary.eventCount).toBe(2);
    expect(summary.writableCount).toBe(2);
    expect(summary.exactPersonCount).toBe(2);
    expect(summary.allWritable).toBe(true);
    expect(summary.fullIdentitiesStoredInReport).toBe(false);
    expect(observedState.factReview.ready).toBe(true);
    expect(JSON.stringify(summary)).not.toContain("private.person@example.com");
    expect(JSON.stringify(summary)).not.toContain("private_handle");
    expect(summarizeFactReview(validObservedEventsPayload)).toMatchObject({
      supplied: true,
      reviewed: true,
      validFactCount: 1,
      ready: true,
      exactFactsStoredInReport: false,
    });
  });

  test("marks all inputs ready when redacted seed and observed events are valid", () => {
    const report = buildMissingInputsIntake({
      missingInputsKit,
      operatorRunbook,
      crmWriteApprovalPacket,
      seedEmailRead: {
        present: true,
        content: "seed.person@example.com\n",
        error: null,
      },
      seedEmailFile: "/tmp/private/seed.txt",
      observedEventsRead: {
        present: true,
        value: validObservedEventsPayload,
        error: null,
        chars: 100,
      },
      observedEventsFile: "/tmp/private/events.json",
      generatedAt: "2026-05-28T00:00:00.000Z",
    });
    const markdown = renderMarkdown(report);

    expect(report.status).toBe("missing_inputs_intake_all_inputs_ready_no_live_changes");
    expect(report.executiveSummary.readyInputCount).toBe(5);
    expect(report.executiveSummary.readyForSeedApprovalPacket).toBe(true);
    expect(report.executiveSummary.readyForCrmWritePacketRegeneration).toBe(true);
    expect(report.executiveSummary.readyForCrmApprovalRequest).toBe(true);
    expect(report.executiveSummary.canAskApprovalNow).toBe(false);
    expect(report.postInputCommands.seedApprovalPacket).toContain("npm run seed");
    expect(report.postInputCommands.crmWriteApprovalPacket).toContain("npm run crm");
    expect(markdown).toContain("Missing Inputs Intake");
    expect(markdown).toContain("Can ask approval now: false");
    expect(JSON.stringify(report)).not.toContain("seed.person@example.com");
    expect(JSON.stringify(report)).not.toContain("private.person@example.com");
  });
});
