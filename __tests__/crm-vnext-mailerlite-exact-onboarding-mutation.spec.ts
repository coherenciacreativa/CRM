import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, test } from "vitest";

import {
  BLOCKED_CLIENT_CONTRACT_MISSING,
  COMPLETED_FINAL_CHECK_ROUTE_STATUS,
  FUTURE_EXACT_APPROVAL_PHRASE,
  assertAllowedExactMutationRequest,
  run,
  validateFinalCheckReceipt,
} from "../scripts/crm-vnext-mailerlite-exact-onboarding-mutation.mjs";

const execFileAsync = promisify(execFile);
const SCRIPT = "scripts/crm-vnext-mailerlite-exact-onboarding-mutation.mjs";
const EXPECTED_SCRIPT = "crm:vnext:mailerlite-exact-onboarding-mutation";
const FAKE_EMAIL = "person@example.test";
const FAKE_SUBSCRIBER_ID = "sub_fake_secret_000";
const FAKE_GROUP_ID = "grp_fake_secret_123";
const FAKE_AUTO_ID = "auto_fake_secret_456";
const FAKE_FIELD_ID = "fld_fake_secret_789";
const FAKE_TOKEN = "Bearer fake_secret_token";
const RAW_PAYLOAD = "rawApiPayload";
const PRIVATE_MESSAGE = "private message text fixture";
const sensitiveStrings = [
  FAKE_EMAIL,
  FAKE_SUBSCRIBER_ID,
  FAKE_GROUP_ID,
  FAKE_AUTO_ID,
  FAKE_FIELD_ID,
  FAKE_TOKEN,
  "Authorization",
  "MAILERLITE_API_KEY",
  "credentialSource",
  "credentialLength",
  "credentialFingerprint",
  RAW_PAYLOAD,
  PRIVATE_MESSAGE,
];

const expectNoSensitiveStrings = (content: string) => {
  for (const value of sensitiveStrings) {
    expect(content).not.toContain(value);
  }
};

const makeTempRoots = async () => {
  const dir = await mkdtemp(join(tmpdir(), "crm-core-mailerlite-exact-mutation-"));
  const roots = {
    repoRoot: process.cwd(),
    privateMailerLiteRoot: join(dir, "Mantis-Private-Source-Artifacts", "mailerlite"),
    redactedReceiptRoot: join(dir, "Mantis-Reports", "mailerlite", "controlled-welcome-flow"),
  };
  await mkdir(roots.privateMailerLiteRoot, { recursive: true });
  await mkdir(roots.redactedReceiptRoot, { recursive: true });
  return { dir, roots };
};

const packet = (overrides: Record<string, unknown> = {}) => ({
  packet_id: "crm_core_mailerlite_exact_mutation_packet_fixture",
  private_lookup: { email: FAKE_EMAIL },
  mapped_field_families: ["name", "country", "city"],
  rawApiPayload: RAW_PAYLOAD,
  privateSubscriberFixture: {
    id: FAKE_SUBSCRIBER_ID,
    group_id: FAKE_GROUP_ID,
    field_id: FAKE_FIELD_ID,
    automation_id: FAKE_AUTO_ID,
    token: FAKE_TOKEN,
    private_message_text: PRIVATE_MESSAGE,
  },
  ...overrides,
});

const safeFinalCheck = (overrides: Record<string, unknown> = {}) => ({
  route_status: COMPLETED_FINAL_CHECK_ROUTE_STATUS,
  live_lookup_ran: true,
  mailerlite_api_called: true,
  freshness_status: "fresh_within_approved_window",
  subscriber_lookup_status: "not_found",
  subscriber_status_class: "not_found",
  onboarding_group_membership_status: "not_found",
  duplicate_readd_status: "safe_new_or_not_in_group",
  suppression_status: "pass",
  idempotency_status: "pass",
  blockers: [],
  ...overrides,
});

const makeLivePaths = async (packetOverrides: Record<string, unknown> = {}, finalOverrides: Record<string, unknown> = {}) => {
  const { dir, roots } = await makeTempRoots();
  const paths = {
    privatePacket: join(roots.privateMailerLiteRoot, "packet.json"),
    finalCheck: join(roots.redactedReceiptRoot, "final-check.json"),
    privateResultJson: join(roots.privateMailerLiteRoot, "mutation-result.json"),
    privateResultMd: join(roots.privateMailerLiteRoot, "mutation-result.md"),
    receiptJson: join(roots.redactedReceiptRoot, "mutation-receipt.json"),
    receiptMd: join(roots.redactedReceiptRoot, "mutation-receipt.md"),
  };
  await writeFile(paths.privatePacket, `${JSON.stringify(packet(packetOverrides), null, 2)}\n`, "utf8");
  await writeFile(paths.finalCheck, `${JSON.stringify(safeFinalCheck(finalOverrides), null, 2)}\n`, "utf8");
  return { dir, roots, paths };
};

const liveArgs = (paths: Record<string, string>, approvalPhrase = FUTURE_EXACT_APPROVAL_PHRASE) => [
  "--allow-live-exact-onboarding-mutation",
  "--approval-phrase",
  approvalPhrase,
  "--private-packet-json",
  paths.privatePacket,
  "--final-check-redacted-json",
  paths.finalCheck,
  "--private-result-json",
  paths.privateResultJson,
  "--private-result-md",
  paths.privateResultMd,
  "--redacted-receipt-json",
  paths.receiptJson,
  "--redacted-receipt-md",
  paths.receiptMd,
];

const runMockedLive = async (packetOverrides: Record<string, unknown> = {}, finalOverrides: Record<string, unknown> = {}) => {
  const { dir, roots, paths } = await makeLivePaths(packetOverrides, finalOverrides);
  const calls: Array<string> = [];
  try {
    const receipt = await run(liveArgs(paths), {
      roots,
      allowMockedMutationExecution: true,
      exactMutationClient: {
        upsertSubscriber: async () => calls.push("upsertSubscriber"),
        assignOnboardingGroup: async () => calls.push("assignOnboardingGroup"),
      },
      runId: "crm_core_mailerlite_exact_mutation_guard_test",
    });
    const receiptJsonText = await readFile(paths.receiptJson, "utf8");
    const receiptMdText = await readFile(paths.receiptMd, "utf8");
    const privateResultText = await readFile(paths.privateResultJson, "utf8");
    expectNoSensitiveStrings(receiptJsonText);
    expectNoSensitiveStrings(receiptMdText);
    expectNoSensitiveStrings(privateResultText);
    expect(paths.privateResultJson).toContain(tmpdir());
    return { receipt, calls, paths, dir };
  } catch (error) {
    await rm(dir, { recursive: true, force: true });
    throw error;
  }
};

describe("CRM Core MailerLite exact onboarding mutation execution guard", () => {
  test("fixture/mock mode succeeds and writes redacted JSON/Markdown receipts", async () => {
    const dir = await mkdtemp(join(tmpdir(), "crm-core-mailerlite-exact-fixture-"));
    try {
      const fixtureFile = join(dir, "fixture.json");
      const privateResultJson = join(dir, "private-result.json");
      const privateResultMd = join(dir, "private-result.md");
      const receiptJson = join(dir, "receipt.json");
      const receiptMd = join(dir, "receipt.md");
      await writeFile(fixtureFile, `${JSON.stringify({ packet: packet(), finalCheckReceipt: safeFinalCheck() }, null, 2)}\n`, "utf8");

      const { stdout, stderr } = await execFileAsync("node", [
        SCRIPT,
        "--fixture-file",
        fixtureFile,
        "--private-result-json",
        privateResultJson,
        "--private-result-md",
        privateResultMd,
        "--redacted-receipt-json",
        receiptJson,
        "--redacted-receipt-md",
        receiptMd,
      ], { cwd: process.cwd() });

      const compact = JSON.parse(stdout);
      const receipt = JSON.parse(await readFile(receiptJson, "utf8"));
      const receiptMdText = await readFile(receiptMd, "utf8");
      const privateResultText = await readFile(privateResultJson, "utf8");
      expect(compact.mutation_executed).toBe(true);
      expect(receipt.mutation_result_status).toBe("mutation_executed_redacted_receipt_ready");
      expect(receipt.mapped_field_families).toEqual(["name", "country", "city"]);
      expectNoSensitiveStrings(`${stdout}\n${stderr}`);
      expectNoSensitiveStrings(JSON.stringify(receipt));
      expectNoSensitiveStrings(receiptMdText);
      expectNoSensitiveStrings(privateResultText);
      expect(privateResultJson).toContain(tmpdir());
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("future live mode without explicit approval flag blocks before credential lookup", async () => {
    let credentialCalls = 0;
    await expect(run([], {
      credentialProvider: async () => {
        credentialCalls += 1;
        return { key: "mock" };
      },
    })).rejects.toThrow("not_run_missing_approval");
    expect(credentialCalls).toBe(0);
  });

  test("exact approval phrase absent blocks before credential lookup", async () => {
    const { dir, roots, paths } = await makeLivePaths();
    let credentialCalls = 0;
    try {
      await expect(run(liveArgs(paths, ""), {
        roots,
        credentialProvider: async () => {
          credentialCalls += 1;
          return { key: "mock" };
        },
      })).rejects.toThrow("not_run_missing_approval");
      expect(credentialCalls).toBe(0);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("exact approval phrase mismatch blocks before credential lookup", async () => {
    const { dir, roots, paths } = await makeLivePaths();
    let credentialCalls = 0;
    try {
      await expect(run(liveArgs(paths, "I approve a different unsafe thing"), {
        roots,
        credentialProvider: async () => {
          credentialCalls += 1;
          return { key: "mock" };
        },
      })).rejects.toThrow("not_run_missing_approval");
      expect(credentialCalls).toBe(0);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("invalid private packet path outside approved MailerLite private root is rejected", async () => {
    const { dir, roots, paths } = await makeLivePaths();
    let credentialCalls = 0;
    try {
      const outsidePacket = join(dir, "packet.json");
      await writeFile(outsidePacket, `${JSON.stringify(packet())}\n`, "utf8");
      await expect(run(liveArgs({ ...paths, privatePacket: outsidePacket }), {
        roots,
        credentialProvider: async () => {
          credentialCalls += 1;
          return { key: "mock" };
        },
      })).rejects.toThrow("private_packet_json_outside_approved_root_rejected");
      expect(credentialCalls).toBe(0);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("invalid final-check receipt path outside approved Mantis-Reports root is rejected", async () => {
    const { dir, roots, paths } = await makeLivePaths();
    let credentialCalls = 0;
    try {
      await expect(run(liveArgs({ ...paths, finalCheck: join(dir, "final-check.json") }), {
        roots,
        credentialProvider: async () => {
          credentialCalls += 1;
          return { key: "mock" };
        },
      })).rejects.toThrow("final_check_redacted_json_outside_approved_root_rejected");
      expect(credentialCalls).toBe(0);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("invalid private result path outside approved MailerLite private root is rejected", async () => {
    const { dir, roots, paths } = await makeLivePaths();
    let credentialCalls = 0;
    try {
      await expect(run(liveArgs({ ...paths, privateResultJson: join(dir, "result.json") }), {
        roots,
        credentialProvider: async () => {
          credentialCalls += 1;
          return { key: "mock" };
        },
      })).rejects.toThrow("private_result_json_outside_approved_root_rejected");
      expect(credentialCalls).toBe(0);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("invalid redacted receipt path outside approved Mantis-Reports root is rejected", async () => {
    const { dir, roots, paths } = await makeLivePaths();
    let credentialCalls = 0;
    try {
      await expect(run(liveArgs({ ...paths, receiptMd: join(dir, "receipt.md") }), {
        roots,
        credentialProvider: async () => {
          credentialCalls += 1;
          return { key: "mock" };
        },
      })).rejects.toThrow("redacted_receipt_md_outside_approved_root_rejected");
      expect(credentialCalls).toBe(0);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("output paths inside repo are rejected", async () => {
    const { dir, roots, paths } = await makeLivePaths();
    let credentialCalls = 0;
    try {
      await expect(run(liveArgs({ ...paths, privateResultMd: join(process.cwd(), "tmp-result.md") }), {
        roots,
        credentialProvider: async () => {
          credentialCalls += 1;
          return { key: "mock" };
        },
      })).rejects.toThrow("private_result_md_inside_repo_rejected");
      expect(credentialCalls).toBe(0);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("credential provider is not called if path validation fails", async () => {
    const { dir, roots, paths } = await makeLivePaths();
    let credentialCalls = 0;
    try {
      await expect(run(liveArgs({ ...paths, receiptJson: join(dir, "receipt.json") }), {
        roots,
        credentialProvider: async () => {
          credentialCalls += 1;
          return { key: "mock" };
        },
      })).rejects.toThrow("redacted_receipt_json_outside_approved_root_rejected");
      expect(credentialCalls).toBe(0);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("credential provider is not called if final check is missing", async () => {
    const { dir, roots, paths } = await makeLivePaths();
    let credentialCalls = 0;
    try {
      await rm(paths.finalCheck, { force: true });
      await expect(run(liveArgs(paths), {
        roots,
        credentialProvider: async () => {
          credentialCalls += 1;
          return { key: "mock" };
        },
      })).rejects.toThrow();
      expect(credentialCalls).toBe(0);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("credential provider is not called if final check is stale", async () => {
    const { dir, roots, paths } = await makeLivePaths({}, { freshness_status: "stale" });
    let credentialCalls = 0;
    try {
      await expect(run(liveArgs(paths), {
        roots,
        credentialProvider: async () => {
          credentialCalls += 1;
          return { key: "mock" };
        },
      })).rejects.toThrow("not_run_final_check_stale");
      expect(credentialCalls).toBe(0);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("credential provider is not called if final check readiness is not ready", async () => {
    const { dir, roots, paths } = await makeLivePaths({}, { route_status: "not_ready" });
    let credentialCalls = 0;
    try {
      await expect(run(liveArgs(paths), {
        roots,
        credentialProvider: async () => {
          credentialCalls += 1;
          return { key: "mock" };
        },
      })).rejects.toThrow("not_run_final_check_failed");
      expect(credentialCalls).toBe(0);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("no private packet email lookup input blocks before credential lookup", async () => {
    const { dir, roots, paths } = await makeLivePaths({ private_lookup: {} });
    let credentialCalls = 0;
    try {
      await expect(run(liveArgs(paths), {
        roots,
        credentialProvider: async () => {
          credentialCalls += 1;
          return { key: "mock" };
        },
      })).rejects.toThrow("not_run_missing_private_packet_email_anchor");
      expect(credentialCalls).toBe(0);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("safe final check and valid paths block future live without safe mutation client contract", async () => {
    const { dir, roots, paths } = await makeLivePaths();
    try {
      const receipt = await run(liveArgs(paths), { roots, runId: "crm_core_mailerlite_exact_mutation_guard_test" });
      const receiptJsonText = await readFile(paths.receiptJson, "utf8");
      expect(receipt.mutation_attempted).toBe(false);
      expect(receipt.mutation_executed).toBe(false);
      expect(receipt.blockers).toContain(BLOCKED_CLIENT_CONTRACT_MISSING);
      expect(receipt.recommended_next_step).toBe("resolve_safe_mutation_client_contract");
      expectNoSensitiveStrings(receiptJsonText);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("mocked safe final-check receipt allows mocked mutation path only with approval and valid paths", async () => {
    const { receipt, calls, dir } = await runMockedLive();
    try {
      expect(receipt.mutation_attempted).toBe(true);
      expect(receipt.mutation_executed).toBe(true);
      expect(receipt.mutation_result_status).toBe("mutation_executed_redacted_receipt_ready");
      expect(calls).toEqual(["upsertSubscriber", "assignOnboardingGroup"]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("mocked missing freshness final-check receipt blocks", () => {
    const result = validateFinalCheckReceipt(safeFinalCheck({ freshness_status: undefined }));
    expect(result.ok).toBe(false);
    expect(result.status).toBe("not_run_final_check_stale");
  });

  test("mocked subscriber already in onboarding group blocks", () => {
    const result = validateFinalCheckReceipt(safeFinalCheck({
      subscriber_lookup_status: "found",
      subscriber_status_class: "active",
      onboarding_group_membership_status: "present",
    }));
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("final_check_group_membership_not_safe");
  });

  test.each(["unsubscribed", "bounced", "complained", "junk", "unknown"])("mocked %s state blocks", (statusClass) => {
    const result = validateFinalCheckReceipt(safeFinalCheck({
      subscriber_lookup_status: "found",
      subscriber_status_class: statusClass,
      onboarding_group_membership_status: "absent",
    }));
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("final_check_subscriber_status_blocked");
  });

  test("mocked exact operation calls only allowed upsert/group assignment behavior", () => {
    expect(assertAllowedExactMutationRequest({ method: "POST", path: "/mock/exact-onboarding/subscriber-upsert" })).toBe(true);
    expect(assertAllowedExactMutationRequest({ method: "POST", path: "/mock/exact-onboarding/onboarding-group-assignment" })).toBe(true);
    expect(() => assertAllowedExactMutationRequest({ method: "GET", path: "/mock/exact-onboarding/subscriber-upsert" })).toThrow("blocked_unapproved_mutation_endpoint");
  });

  test("POST/PUT/PATCH/DELETE methods outside allowed endpoints throw before execution", () => {
    expect(() => assertAllowedExactMutationRequest({ method: "POST", path: "/subscribers" })).toThrow("blocked_unapproved_mutation_endpoint");
    expect(() => assertAllowedExactMutationRequest({ method: "PUT", path: "/subscribers/abc" })).toThrow("blocked_destructive_or_partial_update_endpoint");
    expect(() => assertAllowedExactMutationRequest({ method: "PATCH", path: "/subscribers/abc" })).toThrow("blocked_destructive_or_partial_update_endpoint");
    expect(() => assertAllowedExactMutationRequest({ method: "DELETE", path: "/subscribers/abc" })).toThrow("blocked_subscriber_deletion_endpoint");
  });

  test("field creation endpoints are forbidden", () => {
    expect(() => assertAllowedExactMutationRequest({ method: "POST", path: "/fields" })).toThrow("blocked_field_creation_endpoint");
  });

  test("automation mutation endpoints are forbidden", () => {
    expect(() => assertAllowedExactMutationRequest({ method: "POST", path: "/automations" })).toThrow("blocked_automation_mutation_endpoint");
  });

  test("campaign endpoints are forbidden", () => {
    expect(() => assertAllowedExactMutationRequest({ method: "POST", path: "/campaigns/send" })).toThrow("blocked_campaign_endpoint");
  });

  test("segment endpoints are forbidden", () => {
    expect(() => assertAllowedExactMutationRequest({ method: "POST", path: "/segments" })).toThrow("blocked_segment_endpoint");
  });

  test("form endpoints are forbidden", () => {
    expect(() => assertAllowedExactMutationRequest({ method: "POST", path: "/forms" })).toThrow("blocked_form_endpoint");
  });

  test("webhook endpoints are forbidden", () => {
    expect(() => assertAllowedExactMutationRequest({ method: "POST", path: "/webhooks" })).toThrow("blocked_webhook_endpoint");
  });

  test("account settings endpoints are forbidden", () => {
    expect(() => assertAllowedExactMutationRequest({ method: "PATCH", path: "/account/settings" })).toThrow("blocked_account_settings_endpoint");
  });

  test("broad import endpoints are forbidden", () => {
    expect(() => assertAllowedExactMutationRequest({ method: "POST", path: "/subscribers/import" })).toThrow("blocked_broad_import_endpoint");
  });

  test("subscriber deletion is forbidden", () => {
    expect(() => assertAllowedExactMutationRequest({ method: "DELETE", path: "/subscribers/abc" })).toThrow("blocked_subscriber_deletion_endpoint");
  });

  test("group removal endpoints are forbidden", () => {
    expect(() => assertAllowedExactMutationRequest({ method: "DELETE", path: "/groups/abc/subscribers/def" })).toThrow("blocked_group_removal_endpoint");
  });

  test("redacted JSON receipt does not contain synthetic private values", async () => {
    const { paths, dir } = await runMockedLive();
    try {
      expectNoSensitiveStrings(await readFile(paths.receiptJson, "utf8"));
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("redacted Markdown receipt does not contain synthetic private values", async () => {
    const { paths, dir } = await runMockedLive();
    try {
      expectNoSensitiveStrings(await readFile(paths.receiptMd, "utf8"));
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("private result test output is under /tmp only", async () => {
    const { paths, dir } = await runMockedLive();
    try {
      expect(paths.privateResultJson).toContain(tmpdir());
      expect(paths.privateResultMd).toContain(tmpdir());
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("tests do not touch real Mantis-Reports or real Mantis-Private-Source-Artifacts", async () => {
    const { paths, dir } = await runMockedLive();
    try {
      expect(paths.receiptJson).toContain(tmpdir());
      expect(paths.receiptMd).toContain(tmpdir());
      expect(paths.privateResultJson).toContain(tmpdir());
      expect(paths.privateResultMd).toContain(tmpdir());
      expect(paths.receiptJson).not.toContain("/Users/alejandrogomez/Documents/Mantis-Reports");
      expect(paths.privateResultJson).not.toContain("/Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("package.json remains valid JSON and exposes the exact mutation script", async () => {
    const pkg = JSON.parse(await readFile(join(process.cwd(), "package.json"), "utf8"));
    expect(pkg.scripts[EXPECTED_SCRIPT]).toBe("node scripts/crm-vnext-mailerlite-exact-onboarding-mutation.mjs");
  });

  test("package-lock.json is unchanged", async () => {
    const { stdout } = await execFileAsync("git", ["diff", "--name-only", "--", "package-lock.json"], { cwd: process.cwd() });
    expect(stdout.trim()).toBe("");
  });
});
