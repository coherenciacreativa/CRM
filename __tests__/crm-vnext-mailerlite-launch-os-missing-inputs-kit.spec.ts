import { describe, expect, test } from "vitest";

import {
  buildInputRequests,
  buildMissingInputsKit,
  buildSafety,
  markdownPathFor,
  parseArgs,
  renderMarkdown,
} from "../scripts/crm-vnext-mailerlite-launch-os-missing-inputs-kit.mjs";

const handoff = {
  status: "blocked_gate_handoff_ready_no_live_changes",
  executiveSummary: {
    blockedGateCount: 2,
    openLiveMutationGateCount: 0,
  },
  inputNeededNow: [
    {
      id: "exact_seed_recipient",
      gateId: "mini_launch_seed_send",
      label: "Exact private seed recipient",
      requiredFor: "Only after this exists can the seed-send approval phrase be generated.",
      acceptableForm: "One explicit email address supplied through a private/approved channel or file.",
    },
    {
      id: "real_observed_events_file",
      gateId: "crm_signal_writes",
      label: "Real observed events file",
      requiredFor: "Turns the sample-only contract into real evidence that can be previewed for writes.",
      acceptableForm: "{ events: [ { eventKind, sourceKind, channel, sourceId, observedAt, metrics.launchId, email|instagramHandle|personId, evidenceSourcePath } ] }",
    },
    {
      id: "exact_people",
      gateId: "crm_signal_writes",
      label: "Exact people or CRM identities",
      requiredFor: "Prevents sample or anonymous launch signals from becoming person history.",
      acceptableForm: "email, instagramHandle, or personId per event.",
    },
    {
      id: "writable_event_screen",
      gateId: "crm_signal_writes",
      label: "Writable-event screen",
      requiredFor: "Filters samples before any approval request.",
      acceptableForm: "Rerun CRM write approval packet after observed events exist.",
    },
    {
      id: "fact_store_market_review",
      gateId: "crm_signal_writes",
      label: "Aggregate market review and exact facts",
      requiredFor: "Only needed if the next selected write family is Fact Store.",
      acceptableForm: "A reviewed list of exact aggregate facts plus evidence ids and separate Fact Store approval later.",
    },
  ],
};

const seedSendApproval = {
  status: "seed_send_approval_packet_waiting_exact_seed_recipient_no_live_changes",
  inputRequest: {
    nextLocalCommandAfterSeedRecipient: "npm run crm:vnext:mailerlite-mini-launch-seed-send-approval-packet -- --seed-email-file <private_seed_email_file> --out /tmp/seed.json --markdown-out /tmp/seed.md",
  },
};

const crmWriteApproval = {
  status: "crm_write_approval_packet_blocked_missing_observed_events_no_live_changes",
  observedEventInputContract: {
    acceptedShape: "{ \"events\": [ { eventKind, sourceKind, channel, sourceId, observedAt, metrics.launchId, email|instagramHandle|personId, evidenceSourcePath } ] }",
  },
};

const seedInboxCorrectionPlan = {
  status: "seed_inbox_correction_plan_ready_no_live_changes",
  requiredInputsBeforeUiEditApproval: [
    {
      id: "final_public_links",
      label: "Final approved public links",
      requiredFor: "Replacing inert placeholders before any public/audience send.",
      acceptableForm: "{ result_or_resource_link, practice_link, editorial_note_link }",
    },
    {
      id: "subscription_reason_policy",
      label: "Footer/subscription-reason policy",
      requiredFor: "Making the Spanish subscription-reason line consistent across E01-E04.",
      acceptableForm: "include_once_in_all_emails or remove_custom_line_and_rely_on_platform_footer",
    },
  ],
};

const runbook = {
  status: "mailerlite_launch_os_operator_runbook_ready_no_live_changes",
};

const sourceDigests = [
  { id: "blockedGateHandoff", path: "/tmp/handoff.json", present: true, chars: 100, consultedFor: "blocked gates" },
];

describe("CRM vNext MailerLite Launch OS missing-inputs kit", () => {
  test("normalizes default paths and custom private paths", () => {
    const parsed = parseArgs([
      "--private-seed-email-file",
      "/tmp/private/seed.txt",
      "--observed-events-file",
      "/tmp/private/events.json",
      "--seed-inbox-correction-plan",
      "/tmp/correction-plan.json",
      "--correction-inputs-file",
      "/tmp/private/correction-inputs.json",
      "--launch-asset-manifest",
      "/tmp/asset-manifest.json",
      "--out",
      "/tmp/kit.json",
      "--markdown-out",
      "/tmp/kit.md",
    ]);

    expect(parsed.blockedGateHandoff).toContain("mailerlite_launch_os_blocked_gate_handoff_2026-05-28.json");
    expect(parsed.privateSeedEmailFile).toBe("/tmp/private/seed.txt");
    expect(parsed.observedEventsFile).toBe("/tmp/private/events.json");
    expect(parsed.seedInboxCorrectionPlan).toBe("/tmp/correction-plan.json");
    expect(parsed.correctionInputsFile).toBe("/tmp/private/correction-inputs.json");
    expect(parsed.launchAssetManifest).toBe("/tmp/asset-manifest.json");
    expect(parsed.out).toBe("/tmp/kit.json");
    expect(markdownPathFor("/tmp/report.json")).toBe("/tmp/report.md");
  });

  test("turns blocked-gate input ids into concrete input requests without approval", () => {
    const inputRequests = buildInputRequests({
      handoff,
      seedSendApproval,
      crmWriteApproval,
      seedInboxCorrectionPlan,
      privateSeedEmailFile: "/tmp/private/seed.txt",
      observedEventsFile: "/tmp/private/events.json",
      correctionInputsFile: "/tmp/private/correction-inputs.json",
      launchAssetManifest: "/tmp/asset-manifest.json",
    });

    expect(inputRequests.map((input) => input.id)).toEqual([
      "exact_seed_recipient",
      "real_observed_events_file",
      "exact_people",
      "writable_event_screen",
      "fact_store_market_review",
      "final_public_links",
      "subscription_reason_policy",
    ]);
    expect(inputRequests.find((input) => input.id === "exact_seed_recipient")).toMatchObject({
      privacy: "private",
      captureMode: "private_seed_email_file_preferred",
      approvalEffect: "does_not_approve_send_or_execution",
      nextLocalCommandAfterInput: expect.stringContaining("/tmp/private/seed.txt"),
    });
    expect(inputRequests.find((input) => input.id === "real_observed_events_file")).toMatchObject({
      sampleOnly: true,
      mustReplaceBeforeUse: true,
      approvalEffect: "does_not_approve_crm_writes",
    });
    expect(inputRequests.find((input) => input.id === "final_public_links")).toMatchObject({
      gateId: "mini_launch_seed_inbox_correction",
      captureMode: "launch_asset_manifest.finalPublicLinks_or_correction_inputs_json.finalPublicLinks",
      templatePathSuggestion: "/tmp/private/correction-inputs.json",
      manifestPathSuggestion: "/tmp/asset-manifest.json",
      humanInputRequiredByDefault: false,
      approvalEffect: "does_not_approve_mailerlite_ui_edit_test_send_or_public_send",
    });
  });

  test("builds a no-live kit with templates, commands and hard stops", () => {
    const kit = buildMissingInputsKit({
      handoff,
      seedSendApproval,
      crmWriteApproval,
      seedInboxCorrectionPlan,
      runbook,
      sourceDigests,
      privateSeedEmailFile: "/tmp/private/seed.txt",
      observedEventsFile: "/tmp/private/events.json",
      correctionInputsFile: "/tmp/private/correction-inputs.json",
      launchAssetManifest: "/tmp/asset-manifest.json",
      generatedAt: "2026-05-28T00:00:00.000Z",
    });
    const markdown = renderMarkdown(kit);

    expect(kit.status).toBe("missing_inputs_kit_ready_no_live_changes");
    expect(kit.executiveSummary).toMatchObject({
      inputCount: 7,
      seedInputCount: 1,
      crmInputCount: 4,
      correctionInputCount: 2,
      canAskApprovalNow: false,
      kitCreatesPrivateFiles: false,
      kitAsksApproval: false,
      nextSafeAction: "collect_missing_inputs_without_approval_or_execution",
    });
    expect(kit.postInputCommands.join(" ")).toContain("--markdown-out /Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_crm_write_approval_packet_inteligencia_descansar_2026-05-28.md");
    expect(kit.templates.observedEventsFile.sampleOnly).toBe(true);
    expect(kit.templates.correctionInputsFile.defaultSource).toBe("launch_asset_manifest_before_private_override");
    expect(kit.templates.correctionInputsFile.template.subscriptionReasonPolicy).toBe("remove_custom_line_and_rely_on_platform_footer");
    expect(kit.templates.correctionInputsFile.template.allowedSubscriptionReasonPolicies).toContain("include_once_in_all_emails");
    expect(markdown).toContain("Missing Inputs Kit");
    expect(markdown).toContain("This kit is not an approval phrase");
    expect(markdown).toContain("Final public links and subscription policy inputs do not approve MailerLite UI edits");
    expect(markdown).toContain("Sends performed: false");
  });

  test("keeps safety closed", () => {
    expect(buildSafety()).toMatchObject({
      localOnly: true,
      kitCreatesPrivateFiles: false,
      kitAsksApproval: false,
      mailerLiteApiCalled: false,
      sendsPerformed: false,
      crmLiveApiCalled: false,
      factStoreWritePerformed: false,
      tokensPrinted: false,
    });
  });
});
