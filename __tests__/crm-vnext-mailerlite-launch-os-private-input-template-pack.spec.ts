import { describe, expect, test } from "vitest";

import {
  buildPrivateInputTemplatePack,
  buildSafety,
  buildTemplateRows,
  parseArgs,
  renderMarkdown,
} from "../scripts/crm-vnext-mailerlite-launch-os-private-input-template-pack.mjs";

const missingInputsKit = {
  status: "missing_inputs_kit_ready_no_live_changes",
  inputRequests: [
    {
      id: "exact_seed_recipient",
      gateId: "mini_launch_seed_send",
      label: "Exact private seed recipient",
      templatePathSuggestion: "/tmp/private/mailerlite_seed_recipient_inteligencia_descansar.txt",
      approvalEffect: "does_not_approve_send_or_execution",
    },
    {
      id: "real_observed_events_file",
      gateId: "crm_signal_writes",
      label: "Real observed events file",
      templatePathSuggestion: "/tmp/private/mailerlite_mini_launch_observed_events_inteligencia_descansar_2026-05-28.json",
      approvalEffect: "does_not_approve_crm_writes",
    },
    {
      id: "exact_people",
      gateId: "crm_signal_writes",
      label: "Exact people or CRM identities",
      templatePathSuggestion: "/tmp/private/mailerlite_mini_launch_observed_events_inteligencia_descansar_2026-05-28.json",
      approvalEffect: "does_not_approve_crm_writes",
    },
  ],
};

describe("CRM vNext MailerLite Launch OS private input template pack", () => {
  test("normalizes defaults and no-write option", () => {
    const parsed = parseArgs([
      "--examples-dir",
      "/tmp/examples",
      "--out",
      "/tmp/report.json",
      "--markdown-out",
      "/tmp/report.md",
      "--no-write-examples",
    ]);

    expect(parsed.missingInputsKit).toContain("mailerlite_launch_os_missing_inputs_kit_2026-05-28.json");
    expect(parsed.examplesDir).toBe("/tmp/examples");
    expect(parsed.out).toBe("/tmp/report.json");
    expect(parsed.markdownOut).toBe("/tmp/report.md");
    expect(parsed.writeExamples).toBe(false);
  });

  test("builds inert template rows that do not collide with active intake paths", () => {
    const rows = buildTemplateRows({
      missingInputsKit,
      examplesDir: "/tmp/examples",
    });

    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.id)).toEqual([
      "exact_seed_recipient",
      "real_observed_events_file",
      "exact_people",
    ]);
    for (const row of rows) {
      expect(row.exampleIsActiveInputPath).toBe(false);
      expect(row.intakeWillIgnoreExample).toBe(true);
      if (row.id === "writable_event_screen") {
        expect(row.templateKind).toBe("derived_report_no_example_file");
        expect(row.examplePath).toBeNull();
        expect(row.sampleOnly).toBe(false);
        expect(row.mustReplaceBeforeUse).toBe(false);
      } else {
        expect(row.templateKind).toBe("inert_example_file");
        expect(row.examplePath).toContain(".example.");
        expect(row.sampleOnly).toBe(true);
        expect(row.mustReplaceBeforeUse).toBe(true);
      }
    }
    expect(rows.find((row) => row.id === "exact_seed_recipient")?.content).toContain("seed.person@example.invalid");
    expect(rows.find((row) => row.id === "real_observed_events_file")?.content).toContain("real.person@example.invalid");
  });

  test("reports template pack without creating approval or live gates", () => {
    const report = buildPrivateInputTemplatePack({
      missingInputsKit,
      examplesDir: "/tmp/examples",
      writeExamples: false,
      generatedAt: "2026-05-28T00:00:00.000Z",
    });
    const markdown = renderMarkdown(report);

    expect(report.status).toBe("private_input_template_pack_ready_no_live_changes");
    expect(report.executiveSummary).toMatchObject({
      templateCount: 3,
      exampleFileCount: 2,
      writeExamples: false,
      activePathCollisionCount: 0,
      canAskApprovalNow: false,
      openLiveMutationGateCount: 0,
      nextSafeAction: "copy_real_values_into_active_private_paths_only_when_they_exist",
    });
    expect(report.templateRows[0]).not.toHaveProperty("content");
    expect(report.hardStops.join(" ")).toContain("not approval");
    expect(markdown).toContain("Private Input Template Pack");
    expect(markdown).toContain("Creates active private input files: false");
  });

  test("keeps safety closed while allowing only inert examples", () => {
    expect(buildSafety({ writeExamples: true })).toMatchObject({
      localOnly: true,
      writesInertExampleFiles: true,
      createsActivePrivateInputFiles: false,
      writesRealPrivateValues: false,
      asksApproval: false,
      mailerLiteApiCalled: false,
      sendsPerformed: false,
      crmLiveApiCalled: false,
      factStoreWritePerformed: false,
    });
  });
});
