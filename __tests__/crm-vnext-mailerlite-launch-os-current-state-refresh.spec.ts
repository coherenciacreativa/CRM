import { describe, expect, test } from "vitest";
import {
  assertLocalOnlyCommandPlan,
  buildCurrentStateRefreshPlan,
  buildRefreshReceipt,
  buildReportCommands,
  buildReportPaths,
  buildSafety,
  formatCommand,
  parseArgs,
  parseVitestCounts,
  renderMarkdown,
} from "../scripts/crm-vnext-mailerlite-launch-os-current-state-refresh.mjs";

const reportsDir = "/tmp/mantis-reports";

describe("CRM vNext MailerLite Launch OS current-state refresh", () => {
  test("normalizes args and current report paths", () => {
    const options = parseArgs([
      "--date",
      "2026-05-31",
      "--reports-dir",
      reportsDir,
      "--out",
      "/tmp/refresh.json",
    ]);

    expect(options.date).toBe("2026-05-31");
    expect(options.reportsDir).toBe(reportsDir);
    expect(options.out).toBe("/tmp/refresh.json");
    expect(options.markdownOut).toBe("/tmp/refresh.md");
  });

  test("builds a local-only command plan for current-state report regeneration", () => {
    const plan = buildCurrentStateRefreshPlan({
      date: "2026-05-31",
      reportsDir,
    });
    const commands = [...plan.validationCommands, ...plan.reportCommands].map(formatCommand).join("\n");

    expect(plan.paths.operatorRunbook).toBe(
      "/tmp/mantis-reports/mailerlite_launch_os_operator_runbook_current_2026-05-31.json",
    );
    expect(plan.paths.goalAudit).toBe(
      "/tmp/mantis-reports/mailerlite_launch_os_v0_goal_audit_current_2026-05-31.json",
    );
    expect(plan.paths.validationReceipt).toBe(
      "/tmp/mantis-reports/mailerlite_launch_os_validation_receipt_current_2026-05-31.json",
    );
    expect(plan.paths.currentStateRefresh).toBe(
      "/tmp/mantis-reports/mailerlite_launch_os_current_state_refresh_current_2026-05-31.json",
    );
    expect(commands).toContain("crm-vnext-mailerlite-launch-os-current-state-refresh.mjs");
    expect(commands).toContain("crm:vnext:mailerlite-launch-os-operator-runbook");
    expect(commands).toContain("crm:vnext:mailerlite-launch-os-goal-audit");
    expect(commands).toContain("crm:vnext:mailerlite-launch-os-validation-receipt");
    expect(commands).toContain("mailerlite_launch_os_missing_inputs_request_bundle_current_2026-05-31.json");
    expect(commands).toContain("mailerlite_launch_os_taxonomy_refresh_response_request_bundle_current_2026-05-31.json");
    expect(commands).not.toContain("--write");
    expect(commands).not.toContain("--execute");
    expect(assertLocalOnlyCommandPlan(plan)).toBe(true);
  });

  test("threads validation results into report commands without live operations", () => {
    const paths = buildReportPaths({ date: "2026-05-31", reportsDir });
    const validationResult = {
      runValidation: true,
      commands: buildCurrentStateRefreshPlan({ date: "2026-05-31", reportsDir }).validationCommands,
      testFiles: 4,
      testCount: 45,
    };
    const reportCommands = buildReportCommands(paths, validationResult);
    const validationReceiptCommand = reportCommands.find((entry) => entry.id === "refresh_validation_receipt");

    expect(validationReceiptCommand?.args).toContain("--validation-status");
    expect(validationReceiptCommand?.args).toContain("passed");
    expect(validationReceiptCommand?.args).toContain("--test-files");
    expect(validationReceiptCommand?.args).toContain("4");
    expect(validationReceiptCommand?.args).toContain("--test-count");
    expect(validationReceiptCommand?.args).toContain("45");
    expect(formatCommand(validationReceiptCommand!)).not.toContain("--write");
  });

  test("parses focused Vitest counts from command output", () => {
    const counts = parseVitestCounts([
      {
        id: "focused_vitest",
        stdoutTail: " Test Files  4 passed (4)\n      Tests  45 passed (45)",
        stderrTail: "",
      },
    ]);

    expect(counts).toEqual({ testFiles: 4, testCount: 45 });
  });

  test("builds a refresh receipt with hard safety gates closed", () => {
    const paths = buildReportPaths({ date: "2026-05-31", reportsDir });
    const commandResults = [
      {
        id: "node_check_current_state_refresh",
        purpose: "syntax-check",
        command: "node --check scripts/current.mjs",
        startedAt: "2026-05-31T00:00:00.000Z",
        finishedAt: "2026-05-31T00:00:01.000Z",
        exitCode: 0,
        signal: null,
        ok: true,
        stdoutTail: "",
        stderrTail: "",
        error: null,
      },
    ];
    const receipt = buildRefreshReceipt({
      options: {
        date: "2026-05-31",
        reportsDir,
        out: "/tmp/refresh.json",
        markdownOut: "/tmp/refresh.md",
      },
      paths,
      validationResults: commandResults,
      reportResults: [],
      validationResult: {
        runValidation: true,
        commands: [],
        testFiles: 4,
        testCount: 45,
      },
      generatedReports: {
        operatorRunbook: {
          path: paths.operatorRunbook,
          markdownPath: paths.operatorRunbookMarkdown,
          status: "mailerlite_launch_os_operator_runbook_ready_no_live_changes",
          ok: true,
          openLiveGateCount: 0,
          validationStatus: "passed",
        },
        goalAudit: {
          path: paths.goalAudit,
          markdownPath: paths.goalAuditMarkdown,
          status: "goal_active_not_ready_for_live_operation",
          ok: true,
          readyForLiveOperation: false,
          liveActionAllowedNow: false,
          provenCount: 7,
          partialCount: 3,
          blockedCount: 0,
        },
        validationReceipt: {
          path: paths.validationReceipt,
          markdownPath: paths.validationReceiptMarkdown,
          status: "mailerlite_launch_os_validation_receipt_ready_no_live_changes",
          ok: true,
          validationStatus: "passed",
          liveGatesClosed: true,
          testFiles: 4,
          testCount: 45,
        },
      },
      generatedAt: "2026-05-31T00:00:02.000Z",
    });

    expect(receipt.status).toBe("mailerlite_launch_os_current_state_refresh_ready_no_live_changes");
    expect(receipt.safety).toMatchObject({
      localOnly: true,
      mailerLiteApiCalled: false,
      shopifyApiCalled: false,
      crmLiveApiCalled: false,
      sendsPerformed: false,
    });
    expect(buildSafety().groupMutationsPerformed).toBe(false);
    expect(renderMarkdown(receipt)).toContain("Current-State Refresh");
  });
});
