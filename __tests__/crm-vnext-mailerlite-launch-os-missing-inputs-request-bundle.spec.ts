import { describe, expect, test } from "vitest";

import {
  buildMissingInputsRequestBundle,
  buildRequestBlocks,
  buildSafety,
  parseArgs,
  renderMarkdown,
} from "../scripts/crm-vnext-mailerlite-launch-os-missing-inputs-request-bundle.mjs";

const missingInputsKit = {
  status: "missing_inputs_kit_ready_no_live_changes",
  executiveSummary: {
    inputCount: 5,
    canAskApprovalNow: false,
    kitCreatesPrivateFiles: false,
    kitAsksApproval: false,
    openLiveMutationGateCount: 0,
  },
  inputRequests: [
    {
      id: "exact_seed_recipient",
      gateId: "mini_launch_seed_send",
      label: "Exact private seed recipient",
      templatePathSuggestion: "/tmp/private/mailerlite_seed_recipient.txt",
      approvalEffect: "does_not_approve_send_or_execution",
      nextLocalCommandAfterInput: "npm run seed -- --seed-email-file /tmp/private/mailerlite_seed_recipient.txt",
    },
    {
      id: "real_observed_events_file",
      gateId: "crm_signal_writes",
      templatePathSuggestion: "/tmp/private/observed_events.json",
      approvalEffect: "does_not_approve_crm_writes",
      nextLocalCommandAfterInput: "npm run crm -- --observed-events-file /tmp/private/observed_events.json",
    },
    {
      id: "exact_people",
      gateId: "crm_signal_writes",
      templatePathSuggestion: "/tmp/private/observed_events.json",
      approvalEffect: "does_not_approve_crm_writes",
    },
    {
      id: "writable_event_screen",
      gateId: "crm_signal_writes",
      templatePathSuggestion: "/tmp/private/observed_events.json",
      approvalEffect: "does_not_approve_crm_writes",
    },
    {
      id: "fact_store_market_review",
      gateId: "crm_signal_writes",
      templatePathSuggestion: "/tmp/private/observed_events.json",
      approvalEffect: "does_not_approve_fact_store_write",
    },
  ],
  postInputCommands: [
    "npm run seed -- --seed-email-file /tmp/private/mailerlite_seed_recipient.txt",
    "npm run crm -- --observed-events-file /tmp/private/observed_events.json",
  ],
};

const missingInputsIntake = {
  status: "missing_inputs_intake_waiting_for_inputs_no_live_changes",
  executiveSummary: {
    inputCount: 5,
    readyInputCount: 0,
    canAskApprovalNow: false,
    blockerIds: [
      "exact_seed_recipient",
      "real_observed_events_file",
      "exact_people",
      "writable_event_screen",
      "fact_store_market_review",
    ],
  },
  inputStates: [
    { id: "exact_seed_recipient", gateId: "mini_launch_seed_send", status: "missing_no_live_changes", blockers: ["seed_email_file_missing"] },
    { id: "real_observed_events_file", gateId: "crm_signal_writes", status: "missing_no_live_changes", blockers: ["observed_events_file_missing"] },
    { id: "exact_people", gateId: "crm_signal_writes", status: "missing_no_live_changes", blockers: ["exact_people_missing_from_observed_events"] },
    { id: "writable_event_screen", gateId: "crm_signal_writes", status: "missing_no_live_changes", blockers: ["writable_event_screen_not_green"] },
    { id: "fact_store_market_review", gateId: "crm_signal_writes", status: "missing_no_live_changes", blockers: ["fact_store_market_review_missing_or_not_reviewed"] },
  ],
};

const blockedGateHandoff = {
  status: "blocked_gate_handoff_ready_no_live_changes",
  inputNeededNow: [
    { id: "exact_seed_recipient", gateId: "mini_launch_seed_send" },
    { id: "real_observed_events_file", gateId: "crm_signal_writes" },
    { id: "exact_people", gateId: "crm_signal_writes" },
    { id: "writable_event_screen", gateId: "crm_signal_writes" },
    { id: "fact_store_market_review", gateId: "crm_signal_writes" },
  ],
};

describe("CRM vNext MailerLite Launch OS missing-inputs request bundle", () => {
  test("normalizes default args and output paths", () => {
    const parsed = parseArgs([
      "--out",
      "/tmp/request-bundle.json",
      "--markdown-out",
      "/tmp/request-bundle.md",
    ]);

    expect(parsed.missingInputsKit).toContain("mailerlite_launch_os_missing_inputs_kit_2026-05-28.json");
    expect(parsed.missingInputsIntake).toContain("mailerlite_launch_os_missing_inputs_intake_2026-05-28.json");
    expect(parsed.blockedGateHandoff).toContain("mailerlite_launch_os_blocked_gate_handoff_2026-05-28.json");
    expect(parsed.out).toBe("/tmp/request-bundle.json");
    expect(parsed.markdownOut).toBe("/tmp/request-bundle.md");
  });

  test("builds five copy-ready requests without approval or private file creation", () => {
    const bundle = buildMissingInputsRequestBundle({
      missingInputsKit,
      missingInputsIntake,
      blockedGateHandoff,
      generatedAt: "2026-05-28T00:00:00.000Z",
    });

    expect(bundle.status).toBe("missing_inputs_request_bundle_ready_no_live_changes");
    expect(bundle.executiveSummary.requestCount).toBe(5);
    expect(bundle.executiveSummary.copyBlocksReady).toBe(true);
    expect(bundle.executiveSummary.requestIds).toEqual([
      "exact_seed_recipient",
      "real_observed_events_file",
      "exact_people",
      "writable_event_screen",
      "fact_store_market_review",
    ]);
    expect(bundle.executiveSummary.createsPrivateFiles).toBe(false);
    expect(bundle.executiveSummary.asksApproval).toBe(false);
    expect(bundle.executiveSummary.canAskApprovalNow).toBe(false);
    expect(bundle.executiveSummary.openLiveMutationGateCount).toBe(0);
    expect(bundle.safety).toMatchObject({
      localOnly: true,
      createsPrivateFiles: false,
      asksApproval: false,
      mailerLiteApiCalled: false,
      crmLiveApiCalled: false,
      sendsPerformed: false,
      factStoreWritePerformed: false,
    });
  });

  test("request text stays redacted and avoids fake private examples", () => {
    const requests = buildRequestBlocks({
      missingInputsKit,
      missingInputsIntake,
      blockedGateHandoff,
    });
    const serialized = JSON.stringify(requests);

    expect(serialized).toContain("no aprueba test send");
    expect(serialized).toContain("no ejecuta escrituras CRM");
    expect(serialized).toContain("/tmp/private/observed_events.json");
    expect(serialized).not.toContain("seed.person@example.com");
    expect(serialized).not.toContain("private.person@example.com");
    expect(serialized).not.toContain("real_person@example.com");
    expect(serialized).not.toContain("sample@example.invalid");
    expect(serialized).not.toContain("sample_handle");
  });

  test("renders markdown with hard stops and safety boundaries", () => {
    const bundle = buildMissingInputsRequestBundle({
      missingInputsKit,
      missingInputsIntake,
      blockedGateHandoff,
      generatedAt: "2026-05-28T00:00:00.000Z",
    });
    const markdown = renderMarkdown(bundle);

    expect(markdown).toContain("Missing Inputs Request Bundle");
    expect(markdown).toContain("Copy-Ready Requests");
    expect(markdown).toContain("This request bundle is not approval");
    expect(markdown).toContain("No live APIs, UI, subscribers, groups, workflows");
    expect(markdown).toContain("Can ask approval now: false");
    expect(buildSafety()).toMatchObject({
      browserOpened: false,
      groupMutationsPerformed: false,
      exactPrivateValuesPrinted: false,
    });
  });
});
