import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, test } from "vitest";

import {
  PRIVATE_MAILERLITE_ROOT,
  buildReportFromFixture,
  renderMarkdown,
  validateOutputPaths,
} from "../scripts/crm-vnext-mailerlite-setup-readonly-verification.mjs";

const execFileAsync = promisify(execFile);
const SCRIPT = "scripts/crm-vnext-mailerlite-setup-readonly-verification.mjs";

const expectedFields = [
  "email",
  "name",
  "country",
  "city",
  "source_channel",
  "source_context",
  "onboarding_started_at",
  "consent_or_context",
  "crm_core_private_anchor_label",
];

const sensitiveStrings = [
  "person@example.test",
  "grp_fake_secret_123",
  "auto_fake_secret_456",
  "fld_fake_secret_789",
  "sub_fake_secret_000",
  "rawApiPayload",
  "Bearer fake",
  "Authorization",
  "MAILERLITE_API_KEY",
];

const expectNoSensitiveStrings = (content) => {
  for (const value of sensitiveStrings) {
    expect(content).not.toContain(value);
  }
};

const baseFixture = () => ({
  expectedMappings: {
    groups: ["CC · Journey · Editorial onboarding · Eligible"],
    automations: ["Onboarding flow"],
    fields: expectedFields,
  },
  setupMetadata: {
    groups: [
      { id: "grp_fake_secret_123", name: "CC · Journey · Editorial onboarding · Eligible" },
      { id: "grp_fake_secret_999", name: "CC · Source · IG onboarding" },
    ],
    automations: [
      { id: "auto_fake_secret_456", name: "Onboarding flow", triggerGroupId: "grp_fake_secret_123" },
    ],
    fields: [
      { id: "fld_fake_secret_789", key: "email", name: "email" },
    ],
  },
  behavior: {
    confirmedGroupTrigger: true,
  },
  suppression: {
    status: "not_verified_no_subscriber_read",
  },
  subscriberProbe: {
    id: "sub_fake_secret_000",
    email: "person@example.test",
    rawApiPayload: "rawApiPayload",
  },
});

const readyExceptRetriggerFixture = () => ({
  expectedMappings: {
    groups: ["CC · Journey · Editorial onboarding · Eligible"],
    automations: ["Onboarding flow"],
    fields: expectedFields,
  },
  setupMetadata: {
    groups: [{ id: "grp_fake_secret_123", name: "CC · Journey · Editorial onboarding · Eligible" }],
    automations: [{ id: "auto_fake_secret_456", name: "Onboarding flow" }],
    fields: expectedFields.map((field, index) => ({ id: `fld_fake_secret_${789 + index}`, key: field, name: field })),
  },
  behavior: {
    confirmedGroupTrigger: true,
  },
  suppression: {
    aggregateVerifiedNoPrivateRows: true,
  },
});

describe("CRM Core MailerLite setup readonly verification guard", () => {
  test("fixture mode succeeds with synthetic setup metadata and redacted receipts", async () => {
    const dir = await mkdtemp(join(tmpdir(), "crm-core-mailerlite-setup-verification-"));
    try {
      const fixtureFile = join(dir, "fixture.json");
      const receiptJson = join(dir, "receipt.json");
      const receiptMd = join(dir, "receipt.md");
      await writeFile(fixtureFile, `${JSON.stringify(baseFixture(), null, 2)}\n`, "utf8");

      const result = await execFileAsync("node", [
        SCRIPT,
        "--fixture-file",
        fixtureFile,
        "--redacted-receipt-json",
        receiptJson,
        "--redacted-receipt-md",
        receiptMd,
      ], { cwd: process.cwd() });

      const stdout = result.stdout;
      const stderr = result.stderr;
      const compact = JSON.parse(stdout);
      const jsonReceiptText = await readFile(receiptJson, "utf8");
      const markdown = await readFile(receiptMd, "utf8");
      const report = JSON.parse(jsonReceiptText);

      expect(compact.ok).toBe(true);
      expect(compact.liveMailerLiteApiCalled).toBe(false);
      expect(compact.subscriberRowsRead).toBe(false);
      expect(report.finalState).toBe("fixture_setup_verification_receipt_created");
      expect(markdown).toContain("MailerLite Setup Read-Only Verification Redacted Receipt");
      expectNoSensitiveStrings(`${stdout}\n${stderr}`);
      expectNoSensitiveStrings(jsonReceiptText);
      expectNoSensitiveStrings(markdown);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("field mapping status counts are computed", () => {
    const report = buildReportFromFixture(baseFixture(), { generatedAt: "2026-07-06T00:00:00.000Z" });

    expect(report.setupReadiness.fieldMappingStatusCounts).toMatchObject({
      confirmed_existing_field: 1,
      missing_or_not_found: 8,
    });
  });

  test("group and automation mapping statuses are computed", () => {
    const report = buildReportFromFixture(baseFixture(), { generatedAt: "2026-07-06T00:00:00.000Z" });

    expect(report.setupReadiness.groupMappingStatus).toBe("confirmed_current_existing_label");
    expect(report.setupReadiness.automationMappingStatus).toBe("confirmed_current_existing_label");
  });

  test("trigger behavior stays unknown unless explicitly confirmed", () => {
    const fixture = baseFixture();
    delete fixture.behavior.confirmedGroupTrigger;
    const report = buildReportFromFixture(fixture, { generatedAt: "2026-07-06T00:00:00.000Z" });

    expect(report.setupReadiness.triggerBehaviorStatus).toBe("unknown_requires_behavior_check");
  });

  test("trigger behavior can be confirmed by synthetic fixture metadata", () => {
    const report = buildReportFromFixture(baseFixture(), { generatedAt: "2026-07-06T00:00:00.000Z" });

    expect(report.setupReadiness.triggerBehaviorStatus).toBe("confirmed_group_trigger");
  });

  test("retrigger behavior blocks mutation when unknown", () => {
    const report = buildReportFromFixture(readyExceptRetriggerFixture(), { generatedAt: "2026-07-06T00:00:00.000Z" });

    expect(report.setupReadiness.retriggerBehaviorStatus).toBe("unknown_blocks_mutation");
    expect(report.setupReadiness.mutationReadiness).toBe("blocked_retrigger_behavior_unknown");
  });

  test("suppression remains not verified unless aggregate-only fixture proves otherwise", () => {
    const notVerified = buildReportFromFixture(baseFixture(), { generatedAt: "2026-07-06T00:00:00.000Z" });
    const verified = buildReportFromFixture(readyExceptRetriggerFixture(), { generatedAt: "2026-07-06T00:00:00.000Z" });

    expect(notVerified.setupReadiness.suppressionStatus).toBe("not_verified_no_subscriber_read");
    expect(verified.setupReadiness.suppressionStatus).toBe("aggregate_verified_no_private_rows");
  });

  test("mutation readiness remains blocked unless all required safe facts are confirmed", () => {
    const blocked = buildReportFromFixture(baseFixture(), { generatedAt: "2026-07-06T00:00:00.000Z" });
    const ready = buildReportFromFixture({
      ...readyExceptRetriggerFixture(),
      behavior: { confirmedGroupTrigger: true, retriggerConfirmed: true },
    }, { generatedAt: "2026-07-06T00:00:00.000Z" });

    expect(blocked.setupReadiness.mutationReadiness).not.toBe("ready_for_no_write_mutation_review");
    expect(ready.setupReadiness.mutationReadiness).toBe("ready_for_no_write_mutation_review");
  });

  test("live mode without explicit approval flag fails before source access", async () => {
    const dir = await mkdtemp(join(tmpdir(), "crm-core-mailerlite-setup-verification-"));
    try {
      let error;
      try {
        await execFileAsync("node", [
          SCRIPT,
          "--redacted-receipt-json",
          join(dir, "receipt.json"),
          "--redacted-receipt-md",
          join(dir, "receipt.md"),
        ], { cwd: process.cwd() });
      } catch (caught) {
        error = caught;
      }

      expect(error).toBeTruthy();
      expect(error.code).toBe(2);
      const compact = JSON.parse(error.stdout);
      expect(compact).toMatchObject({
        ok: false,
        status: "blocked",
        reason: "live_readonly_setup_verification_requires_explicit_approval",
      });
      expectNoSensitiveStrings(`${error.stdout}\n${error.stderr}`);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("output paths inside the repo are rejected", () => {
    expect(() => validateOutputPaths({
      redactedReceiptJson: join(process.cwd(), "tmp-receipt.json"),
      redactedReceiptMd: join(tmpdir(), "receipt.md"),
    })).toThrow("redacted_receipt_json_inside_repo_rejected");
  });

  test("Mantis-Reports paths are allowed for future redacted source receipts without touching them", () => {
    const paths = validateOutputPaths({
      redactedReceiptJson: "/Users/alejandrogomez/Documents/Mantis-Reports/future-mailerlite-setup.json",
      redactedReceiptMd: join(tmpdir(), "future-mailerlite-setup.md"),
    });

    expect(paths.mantisReportsAllowed).toBe(true);
  });

  test("future live private artifact path must stay under the approved MailerLite private root", () => {
    expect(() => validateOutputPaths({
      redactedReceiptJson: join(tmpdir(), "receipt.json"),
      redactedReceiptMd: join(tmpdir(), "receipt.md"),
      privateArtifactPath: join(tmpdir(), "private.json"),
    }, { requirePrivateArtifact: true })).toThrow("private_artifact_path_outside_approved_root_rejected");

    expect(() => validateOutputPaths({
      redactedReceiptJson: join(tmpdir(), "receipt.json"),
      redactedReceiptMd: join(tmpdir(), "receipt.md"),
      privateArtifactPath: `${PRIVATE_MAILERLITE_ROOT}/future-setup-private.json`,
    }, { requirePrivateArtifact: true })).not.toThrow();
  });

  test("rendered Markdown receipt remains redacted", () => {
    const report = buildReportFromFixture(readyExceptRetriggerFixture(), { generatedAt: "2026-07-06T00:00:00.000Z" });
    const markdown = renderMarkdown(report);

    expect(markdown).toContain("blocked_retrigger_behavior_unknown");
    expectNoSensitiveStrings(markdown);
  });

  test("package.json remains valid JSON", async () => {
    const packageJson = JSON.parse(await readFile(join(process.cwd(), "package.json"), "utf8"));

    expect(packageJson.scripts["crm:vnext:mailerlite-setup-readonly-verification"]).toBe(
      "node scripts/crm-vnext-mailerlite-setup-readonly-verification.mjs",
    );
  });
});
