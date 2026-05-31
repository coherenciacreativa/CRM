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
    inputCount: 7,
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
      nextLocalCommandAfterInput: "npm run crm -- --observed-events-file /tmp/private/observed_events.json",
    },
    {
      id: "fact_store_market_review",
      gateId: "crm_signal_writes",
      templatePathSuggestion: "/tmp/private/observed_events.json",
      approvalEffect: "does_not_approve_fact_store_write",
    },
    {
      id: "final_public_links",
      gateId: "mini_launch_seed_inbox_correction",
      templatePathSuggestion: "/tmp/private/correction-inputs.json",
      approvalEffect: "does_not_approve_mailerlite_ui_edit_test_send_or_public_send",
      nextLocalCommandAfterInput: "npm run intake -- --correction-inputs-file /tmp/private/correction-inputs.json",
    },
    {
      id: "subscription_reason_policy",
      gateId: "mini_launch_seed_inbox_correction",
      templatePathSuggestion: "/tmp/private/correction-inputs.json",
      approvalEffect: "does_not_approve_mailerlite_ui_edit_test_send_or_public_send",
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
    inputCount: 7,
    readyInputCount: 0,
    canAskApprovalNow: false,
    readyForMiniLaunchCorrectionPreview: false,
    blockerIds: [
      "exact_seed_recipient",
      "real_observed_events_file",
      "exact_people",
      "writable_event_screen",
      "fact_store_market_review",
      "final_public_links",
      "subscription_reason_policy",
    ],
  },
  inputStates: [
    { id: "exact_seed_recipient", gateId: "mini_launch_seed_send", status: "missing_no_live_changes", blockers: ["seed_email_file_missing"] },
    { id: "real_observed_events_file", gateId: "crm_signal_writes", status: "missing_no_live_changes", blockers: ["observed_events_file_missing"] },
    { id: "exact_people", gateId: "crm_signal_writes", status: "missing_no_live_changes", blockers: ["exact_people_missing_from_observed_events"] },
    { id: "writable_event_screen", gateId: "crm_signal_writes", status: "missing_no_live_changes", blockers: ["writable_event_screen_not_green"] },
    { id: "fact_store_market_review", gateId: "crm_signal_writes", status: "missing_no_live_changes", blockers: ["fact_store_market_review_missing_or_not_reviewed"] },
    { id: "final_public_links", gateId: "mini_launch_seed_inbox_correction", status: "missing_no_live_changes", blockers: ["correction_inputs_file_missing"] },
    { id: "subscription_reason_policy", gateId: "mini_launch_seed_inbox_correction", status: "missing_no_live_changes", blockers: ["subscription_reason_policy_missing"] },
  ],
};

const readyCorrectionIntake = {
  ...missingInputsIntake,
  status: "missing_inputs_intake_partial_no_live_changes",
  executiveSummary: {
    ...missingInputsIntake.executiveSummary,
    readyInputCount: 2,
    readyForMiniLaunchCorrectionPreview: true,
  },
  postInputCommands: {
    miniLaunchCorrectionPreview: "npm run preview -- --correction-inputs-file /tmp/private/correction-inputs.json",
  },
  inputStates: missingInputsIntake.inputStates.map((state) =>
    ["final_public_links", "subscription_reason_policy"].includes(state.id)
      ? { ...state, status: "ready_redacted_no_live_changes", blockers: [] }
      : state,
  ),
};

const blockedGateHandoff = {
  status: "blocked_gate_handoff_ready_no_live_changes",
  inputNeededNow: [
    { id: "exact_seed_recipient", gateId: "mini_launch_seed_send" },
    { id: "real_observed_events_file", gateId: "crm_signal_writes" },
    { id: "exact_people", gateId: "crm_signal_writes" },
    { id: "writable_event_screen", gateId: "crm_signal_writes" },
    { id: "fact_store_market_review", gateId: "crm_signal_writes" },
    { id: "final_public_links", gateId: "mini_launch_seed_inbox_correction" },
    { id: "subscription_reason_policy", gateId: "mini_launch_seed_inbox_correction" },
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

  test("builds copy-ready requests without approval or private file creation", () => {
    const bundle = buildMissingInputsRequestBundle({
      missingInputsKit,
      missingInputsIntake,
      blockedGateHandoff,
      generatedAt: "2026-05-28T00:00:00.000Z",
    });

    expect(bundle.status).toBe("missing_inputs_request_bundle_ready_no_live_changes");
    expect(bundle.executiveSummary.requestCount).toBe(7);
    expect(bundle.executiveSummary.copyBlocksReady).toBe(true);
    expect(bundle.executiveSummary.requestIds).toEqual([
      "exact_seed_recipient",
      "real_observed_events_file",
      "exact_people",
      "writable_event_screen",
      "fact_store_market_review",
      "final_public_links",
      "subscription_reason_policy",
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
    expect(serialized).toContain("no aprueba editar MailerLite UI");
    expect(serialized).toContain("Comando local sugerido: npm run crm -- --observed-events-file /tmp/private/observed_events.json");
    expect(serialized).toContain("include_once_in_all_emails");
    expect(serialized).toContain("remove_custom_line_and_rely_on_platform_footer");
    expect(serialized).toContain("/tmp/private/observed_events.json");
    expect(serialized).toContain("/tmp/private/correction-inputs.json");
    expect(serialized).not.toContain("seed.person@example.com");
    expect(serialized).not.toContain("private.person@example.com");
    expect(serialized).not.toContain("real_person@example.com");
    expect(serialized).not.toContain("sample@example.invalid");
    expect(serialized).not.toContain("sample_handle");
    expect(serialized).not.toContain("https://example.com/result");
  });

  test("adds correction preview command only after correction inputs are ready", () => {
    const waitingBundle = buildMissingInputsRequestBundle({
      missingInputsKit,
      missingInputsIntake,
      blockedGateHandoff,
      generatedAt: "2026-05-28T00:00:00.000Z",
    });
    const readyBundle = buildMissingInputsRequestBundle({
      missingInputsKit,
      missingInputsIntake: readyCorrectionIntake,
      blockedGateHandoff,
      generatedAt: "2026-05-28T00:00:00.000Z",
    });

    expect(waitingBundle.postInputCommands).not.toContain("npm run preview -- --correction-inputs-file /tmp/private/correction-inputs.json");
    expect(readyBundle.postInputCommands).toContain("npm run preview -- --correction-inputs-file /tmp/private/correction-inputs.json");
    expect(readyBundle.executiveSummary.asksApproval).toBe(false);
    expect(readyBundle.executiveSummary.canAskApprovalNow).toBe(false);
    expect(readyBundle.safety.mailerLiteApiCalled).toBe(false);
    expect(readyBundle.safety.sendsPerformed).toBe(false);
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
