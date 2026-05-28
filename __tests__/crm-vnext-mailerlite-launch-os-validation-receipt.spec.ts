import { describe, expect, test } from "vitest";

import {
  buildSafety,
  buildValidationReceipt,
  parseArgs,
  renderMarkdown,
} from "../scripts/crm-vnext-mailerlite-launch-os-validation-receipt.mjs";

const runbook = {
  status: "mailerlite_launch_os_operator_runbook_ready_no_live_changes",
  currentState: {
    liveGates: {
      openLiveGateCount: 0,
    },
  },
};

const goalAudit = {
  status: "goal_active_not_ready_for_live_operation",
  executiveSummary: {
    readyForLiveOperation: false,
    liveActionAllowedNow: false,
  },
  safety: {
    mailerLiteApiCalled: false,
    shopifyApiCalled: false,
    crmLiveApiCalled: false,
    sendsPerformed: false,
  },
};

const onboardingTrunkMap = {
  status: "onboarding_trunk_map_ready_no_live_changes",
};

const packageJson = {
  scripts: {
    "crm:vnext:mailerlite-launch-os-operator-runbook": "node scripts/runbook.mjs",
    "crm:vnext:mailerlite-launch-os-approval-queue": "node scripts/approval-queue.mjs",
    "crm:vnext:mailerlite-launch-os-approval-intake": "node scripts/approval-intake.mjs",
    "crm:vnext:mailerlite-launch-os-goal-audit": "node scripts/audit.mjs",
    "crm:vnext:mailerlite-launch-os-validation-receipt": "node scripts/validation-receipt.mjs",
    "crm:vnext:mailerlite-onboarding-trunk-map": "node scripts/trunk-map.mjs",
    "crm:vnext:mailerlite-mini-launch-department-review-response-watcher": "node scripts/response-watcher.mjs",
    "crm:vnext:mailerlite-mini-launch-local-email-asset-plan": "node scripts/local-email-asset-plan.mjs",
    "crm:vnext:mailerlite-mini-launch-email-asset-build-scope-packet": "node scripts/email-asset-build-scope.mjs",
    "crm:vnext:mailerlite-mini-launch-email-builder-payload-manifest": "node scripts/email-builder-payload-manifest.mjs",
    "crm:vnext:mailerlite-mini-launch-email-render-qa-packet": "node scripts/email-render-qa.mjs",
    "crm:vnext:mailerlite-mini-launch-email-asset-build": "node scripts/email-asset-build.mjs",
    "crm:vnext:mailerlite-mini-launch-email-manual-ui-builder-packet": "node scripts/email-manual-ui-builder-packet.mjs",
  },
};

const sourceDigests = [
  {
    path: "/tmp/mailerlite_launch_os_operator_runbook_2026-05-27.json",
    present: true,
    chars: 100,
    sha256: "abc",
    consultedFor: "runbook",
  },
];

describe("CRM vNext MailerLite Launch OS validation receipt", () => {
  test("normalizes args and repeated commands", () => {
    const parsed = parseArgs([
      "--validation-status",
      "passed",
      "--validation-summary",
      "focused checks passed",
      "--test-files",
      "46",
      "--test-count",
      "260",
      "--command",
      "node --check a.mjs",
      "--command",
      "npm exec vitest run x.spec.ts",
      "--out",
      "/tmp/receipt.json",
      "--markdown-out",
      "/tmp/receipt.md",
    ]);

    expect(parsed.runbook).toContain("mailerlite_launch_os_operator_runbook_2026-05-27.json");
    expect(parsed.goalAudit).toContain("mailerlite_launch_os_v0_goal_audit_2026-05-27.json");
    expect(parsed.validationStatus).toBe("passed");
    expect(parsed.testFiles).toBe(46);
    expect(parsed.testCount).toBe(260);
    expect(parsed.commands).toEqual(["node --check a.mjs", "npm exec vitest run x.spec.ts"]);
    expect(parsed.out).toBe("/tmp/receipt.json");
  });

  test("records passed validation only with closed gates and test evidence", () => {
    const receipt = buildValidationReceipt({
      runbook,
      goalAudit,
      onboardingTrunkMap,
      packageJson,
      sourceDigests,
      validationStatus: "passed",
      validationSummary: "node --check plus broad MailerLite Vitest suite passed",
      testFiles: 46,
      testCount: 260,
      commands: ["node --check scripts/a.mjs", "npm exec vitest run __tests__/x.spec.ts"],
      generatedAt: "2026-05-27T00:00:00.000Z",
    });

    expect(receipt.status).toBe("mailerlite_launch_os_validation_receipt_ready_no_live_changes");
    expect(receipt.validationStatus).toBe("passed");
    expect(receipt.evidence.liveGatesClosed).toBe(true);
    expect(receipt.evidence.packageRequiredScriptsPresent).toBe(true);
    expect(receipt.safety).toMatchObject({
      localOnly: true,
      mailerLiteApiCalled: false,
      sendsPerformed: false,
      factStoreWritePerformed: false,
    });
  });

  test("does not mark passed when summary or test counts are missing", () => {
    const receipt = buildValidationReceipt({
      runbook,
      goalAudit,
      onboardingTrunkMap,
      packageJson,
      validationStatus: "passed",
      validationSummary: null,
      testFiles: null,
      testCount: 260,
    });

    expect(receipt.status).toBe("mailerlite_launch_os_validation_receipt_needs_validation_no_live_changes");
    expect(receipt.validationStatus).toBe("needs_validation");
  });

  test("keeps safety closed and renders hard boundary", () => {
    const receipt = buildValidationReceipt({
      runbook,
      goalAudit,
      onboardingTrunkMap,
      packageJson,
      sourceDigests,
      validationStatus: "passed",
      validationSummary: "tests passed",
      testFiles: 46,
      testCount: 260,
      generatedAt: "2026-05-27T00:00:00.000Z",
    });
    const markdown = renderMarkdown(receipt);

    expect(buildSafety()).toMatchObject({
      externalMessagesSent: false,
      mailerLiteApiCalled: false,
      shopifyApiCalled: false,
      crmLiveApiCalled: false,
      subscribersRead: false,
    });
    expect(markdown).toContain("Validation Receipt");
    expect(markdown).toContain("No live actions");
    expect(markdown).toContain("This receipt cannot approve live action");
  });
});
