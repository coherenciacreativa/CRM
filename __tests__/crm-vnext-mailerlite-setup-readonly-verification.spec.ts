import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, test } from "vitest";

import {
  DEFAULT_EXPECTED_MAPPINGS,
  PRIVATE_MAILERLITE_ROOT,
  REDACTED_RECEIPT_ROOT,
  assertSafeSetupRequest,
  buildReportFromFixture,
  createMailerLiteSetupClient,
  renderMarkdown,
  run,
  validateOutputPaths,
} from "../scripts/crm-vnext-mailerlite-setup-readonly-verification.mjs";

const execFileAsync = promisify(execFile);
const SCRIPT = "scripts/crm-vnext-mailerlite-setup-readonly-verification.mjs";

const expectedFields = DEFAULT_EXPECTED_MAPPINGS.fields;
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
  "credentialSource",
  "credentialLength",
  "credentialFingerprint",
];

const expectNoSensitiveStrings = (content) => {
  for (const value of sensitiveStrings) {
    expect(content).not.toContain(value);
  }
};

const makeTempRoots = async () => {
  const dir = await mkdtemp(join(tmpdir(), "crm-core-mailerlite-setup-verification-"));
  const roots = {
    repoRoot: process.cwd(),
    redactedReceiptRoot: join(dir, "Mantis-Reports", "mailerlite", "controlled-welcome-flow"),
    privateMailerLiteRoot: join(dir, "Mantis-Private-Source-Artifacts", "mailerlite"),
  };
  await mkdir(roots.redactedReceiptRoot, { recursive: true });
  await mkdir(roots.privateMailerLiteRoot, { recursive: true });
  return { dir, roots };
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

const liveSetupMetadata = () => ({
  groups: [
    { id: "grp_fake_secret_123", name: "CC · Journey · Editorial onboarding · Eligible" },
  ],
  automations: [
    { id: "auto_fake_secret_456", name: "Onboarding flow", triggerGroupLabel: "CC · Journey · Editorial onboarding · Eligible" },
  ],
  fields: expectedFields.map((field, index) => ({ id: `fld_fake_secret_${789 + index}`, key: field, name: field })),
});

const liveArgs = ({ receiptJson, receiptMd, privateArtifact }) => [
  "--allow-live-readonly-setup-verification",
  "--private-artifact-path",
  privateArtifact,
  "--redacted-receipt-json",
  receiptJson,
  "--redacted-receipt-md",
  receiptMd,
];

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

  test("live mode without explicit approval flag fails before credential lookup or fetch", async () => {
    let credentialCalls = 0;
    let clientCalls = 0;
    await expect(run([
      "--redacted-receipt-json",
      join(tmpdir(), "receipt.json"),
      "--redacted-receipt-md",
      join(tmpdir(), "receipt.md"),
    ], {
      credentialProvider: async () => { credentialCalls += 1; return { key: "fake" }; },
      setupClient: { scanCollection: async () => { clientCalls += 1; return []; } },
    })).rejects.toThrow("live_readonly_setup_verification_requires_explicit_approval");
    expect(credentialCalls).toBe(0);
    expect(clientCalls).toBe(0);
  });

  test("mocked live mode succeeds with setup/config responses and no real network", async () => {
    const { dir, roots } = await makeTempRoots();
    try {
      const receiptJson = join(roots.redactedReceiptRoot, "receipt.json");
      const receiptMd = join(roots.redactedReceiptRoot, "receipt.md");
      const privateArtifact = join(roots.privateMailerLiteRoot, "private.json");
      const calls = [];
      const metadata = liveSetupMetadata();
      const report = await run(liveArgs({ receiptJson, receiptMd, privateArtifact }), {
        roots,
        generatedAt: "2026-07-06T00:00:00.000Z",
        credentialProvider: async () => ({ key: "mock-secret-value" }),
        setupClient: {
          scanCollection: async (path) => {
            calls.push({ method: "GET", path });
            if (path === "/groups") return metadata.groups;
            if (path === "/automations") return metadata.automations;
            if (path === "/fields") return metadata.fields;
            throw new Error(`unexpected_path:${path}`);
          },
        },
        behavior: { retriggerConfirmed: true },
        suppression: { aggregateVerifiedNoPrivateRows: true },
        idempotency: { readyForMutationReviewAfterFinalCheck: true },
      });
      const jsonReceiptText = await readFile(receiptJson, "utf8");
      const markdown = await readFile(receiptMd, "utf8");

      expect(report.setupVerificationStatus).toBe("completed_live_readonly_setup_config_metadata");
      expect(report.closedGates.liveMailerLiteApiCalled).toBe(true);
      expect(report.sourceCounts).toMatchObject({ groupsObserved: 1, automationsObserved: 1, fieldsObserved: 9, subscriberRowsRead: 0 });
      expect(report.setupReadiness.mutationReadiness).toBe("ready_for_no_write_mutation_review");
      expect(calls).toEqual([
        { method: "GET", path: "/groups" },
        { method: "GET", path: "/automations" },
        { method: "GET", path: "/fields" },
      ]);
      expectNoSensitiveStrings(jsonReceiptText);
      expectNoSensitiveStrings(markdown);
      expectNoSensitiveStrings(JSON.stringify(report));
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("mocked live mode writes private setup refs only under approved private artifact root", async () => {
    const { dir, roots } = await makeTempRoots();
    try {
      const receiptJson = join(roots.redactedReceiptRoot, "receipt.json");
      const receiptMd = join(roots.redactedReceiptRoot, "receipt.md");
      const privateArtifact = join(roots.privateMailerLiteRoot, "nested", "private.json");
      await run(liveArgs({ receiptJson, receiptMd, privateArtifact }), {
        roots,
        credentialProvider: async () => ({ key: "mock-secret-value" }),
        setupClient: {
          scanCollection: async (path) => liveSetupMetadata()[path.slice(1)],
        },
      });
      const privateText = await readFile(privateArtifact, "utf8");
      const jsonReceiptText = await readFile(receiptJson, "utf8");
      expect(privateText).toContain("grp_fake_secret_123");
      expect(privateText).toContain("auto_fake_secret_456");
      expect(jsonReceiptText).not.toContain("grp_fake_secret_123");
      expect(privateArtifact.startsWith(roots.privateMailerLiteRoot)).toBe(true);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("stdout from mocked live CLI-compatible run remains redacted", async () => {
    const { dir, roots } = await makeTempRoots();
    try {
      const receiptJson = join(roots.redactedReceiptRoot, "receipt.json");
      const receiptMd = join(roots.redactedReceiptRoot, "receipt.md");
      const privateArtifact = join(roots.privateMailerLiteRoot, "private.json");
      const logs = [];
      const original = console.log;
      console.log = (value) => logs.push(String(value));
      try {
        await run(liveArgs({ receiptJson, receiptMd, privateArtifact }), {
          roots,
          credentialProvider: async () => ({ key: "mock-secret-value" }),
          setupClient: { scanCollection: async (path) => liveSetupMetadata()[path.slice(1)] },
        });
      } finally {
        console.log = original;
      }
      expectNoSensitiveStrings(logs.join("\n"));
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("safe setup request guard blocks mutation methods and subscriber endpoints", () => {
    expect(() => assertSafeSetupRequest({ method: "POST", path: "/groups" })).toThrow("blocked_live_contract_not_redaction_safe");
    expect(() => assertSafeSetupRequest({ method: "PUT", path: "/groups" })).toThrow("blocked_live_contract_not_redaction_safe");
    expect(() => assertSafeSetupRequest({ method: "PATCH", path: "/automations" })).toThrow("blocked_live_contract_not_redaction_safe");
    expect(() => assertSafeSetupRequest({ method: "DELETE", path: "/fields" })).toThrow("blocked_live_contract_not_redaction_safe");
    expect(() => assertSafeSetupRequest({ method: "GET", path: "/subscribers" })).toThrow("blocked_live_contract_not_redaction_safe");
    expect(() => assertSafeSetupRequest({ method: "GET", path: "/subscribers/123" })).toThrow("blocked_live_contract_not_redaction_safe");
    expect(() => assertSafeSetupRequest({ method: "GET", path: "/groups" })).not.toThrow();
  });

  test("live output paths inside the repo are rejected before credential lookup", async () => {
    const { dir, roots } = await makeTempRoots();
    try {
      let credentialCalls = 0;
      await expect(run(liveArgs({
        receiptJson: join(process.cwd(), "tmp-receipt.json"),
        receiptMd: join(roots.redactedReceiptRoot, "receipt.md"),
        privateArtifact: join(roots.privateMailerLiteRoot, "private.json"),
      }), {
        roots,
        credentialProvider: async () => { credentialCalls += 1; return { key: "mock" }; },
      })).rejects.toThrow("redacted_receipt_json_inside_repo_rejected");
      expect(credentialCalls).toBe(0);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("live redacted receipt paths outside approved root are rejected", async () => {
    const { dir, roots } = await makeTempRoots();
    try {
      let credentialCalls = 0;
      await expect(run(liveArgs({
        receiptJson: join(dir, "outside-receipt.json"),
        receiptMd: join(roots.redactedReceiptRoot, "receipt.md"),
        privateArtifact: join(roots.privateMailerLiteRoot, "private.json"),
      }), {
        roots,
        credentialProvider: async () => { credentialCalls += 1; return { key: "mock" }; },
      })).rejects.toThrow("redacted_receipt_json_outside_approved_root_rejected");
      expect(credentialCalls).toBe(0);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("live private setup artifact outside approved root is rejected", async () => {
    const { dir, roots } = await makeTempRoots();
    try {
      let credentialCalls = 0;
      await expect(run(liveArgs({
        receiptJson: join(roots.redactedReceiptRoot, "receipt.json"),
        receiptMd: join(roots.redactedReceiptRoot, "receipt.md"),
        privateArtifact: join(dir, "private.json"),
      }), {
        roots,
        credentialProvider: async () => { credentialCalls += 1; return { key: "mock" }; },
      })).rejects.toThrow("private_artifact_path_outside_approved_root_rejected");
      expect(credentialCalls).toBe(0);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("default live path validators enforce real approved roots without touching them", () => {
    expect(() => validateOutputPaths({
      redactedReceiptJson: `${REDACTED_RECEIPT_ROOT}/future-mailerlite-setup.json`,
      redactedReceiptMd: `${REDACTED_RECEIPT_ROOT}/future-mailerlite-setup.md`,
      privateArtifactPath: `${PRIVATE_MAILERLITE_ROOT}/future-setup-private.json`,
    }, { mode: "live", requirePrivateArtifact: true })).not.toThrow();

    expect(() => validateOutputPaths({
      redactedReceiptJson: join(tmpdir(), "future-mailerlite-setup.json"),
      redactedReceiptMd: `${REDACTED_RECEIPT_ROOT}/future-mailerlite-setup.md`,
      privateArtifactPath: `${PRIVATE_MAILERLITE_ROOT}/future-setup-private.json`,
    }, { mode: "live", requirePrivateArtifact: true })).toThrow("redacted_receipt_json_outside_approved_root_rejected");
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

  test("trigger behavior can be confirmed by mocked setup metadata label", () => {
    const fixture = baseFixture();
    delete fixture.behavior.confirmedGroupTrigger;
    fixture.setupMetadata.automations[0].triggerGroupLabel = "CC · Journey · Editorial onboarding · Eligible";
    const report = buildReportFromFixture(fixture, { generatedAt: "2026-07-06T00:00:00.000Z" });
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
      idempotency: { readyForMutationReviewAfterFinalCheck: true },
    }, { generatedAt: "2026-07-06T00:00:00.000Z" });
    expect(blocked.setupReadiness.mutationReadiness).not.toBe("ready_for_no_write_mutation_review");
    expect(ready.setupReadiness.mutationReadiness).toBe("ready_for_no_write_mutation_review");
  });

  test("createMailerLiteSetupClient uses GET and refuses unsafe mocked fetch routes", async () => {
    const calls = [];
    const fetchImpl = async (url, options) => {
      calls.push({ url: String(url), method: options.method });
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ data: [] }),
      };
    };
    const client = createMailerLiteSetupClient({
      options: { apiBase: "https://connect.mailerlite.com/api", timeoutMs: 1000, maxPages: 1 },
      key: "mock-secret-value",
      fetchImpl,
    });
    await client.scanCollection("/groups", "groups");
    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe("GET");
    expect(calls[0].url).toContain("/groups");
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
