import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, test } from "vitest";

import {
  COMPLETED_LIVE_ROUTE_STATUS,
  DEFAULT_TARGET_GROUP_LABEL,
  MISSING_EMAIL_SCOPE,
  PACKET_SPECIFIC_READONLY_SCOPE,
  PRECHECK_MISSING_EMAIL_ROUTE_STATUS,
  assertSafeFinalCheckRequest,
  buildDecision,
  createMailerLiteFinalCheckClient,
  run,
} from "../scripts/crm-vnext-mailerlite-final-idempotency-suppression-check.mjs";

const execFileAsync = promisify(execFile);
const SCRIPT = "scripts/crm-vnext-mailerlite-final-idempotency-suppression-check.mjs";
const FAKE_EMAIL = "person@example.test";
const FAKE_SUBSCRIBER_ID = "sub_fake_secret_000";
const FAKE_GROUP_ID = "grp_fake_secret_123";
const FAKE_AUTO_ID = "auto_fake_secret_456";
const FAKE_FIELD_ID = "fld_fake_secret_789";
const FAKE_TOKEN = "Bearer fake_secret_token";
const RAW_PAYLOAD = "rawApiPayload";
const EXPECTED_SCRIPT = "crm:vnext:mailerlite-final-idempotency-suppression-check";
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
];

const expectNoSensitiveStrings = (content: string) => {
  for (const value of sensitiveStrings) {
    expect(content).not.toContain(value);
  }
};

const makeTempRoots = async () => {
  const dir = await mkdtemp(join(tmpdir(), "crm-core-mailerlite-final-check-"));
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
  packet_id: "crm_core_mailerlite_minimal_no_write_mutation_review_packet_from_private_evidence_2026-07-06",
  private_lookup: { email: FAKE_EMAIL },
  private_email_anchor_label_present: true,
  target_onboarding_group_label: DEFAULT_TARGET_GROUP_LABEL,
  duplicate_evidence_status: "clear",
  rawApiPayload: RAW_PAYLOAD,
  privateSubscriberFixture: {
    id: FAKE_SUBSCRIBER_ID,
    token: FAKE_TOKEN,
  },
  ...overrides,
});

const activeSubscriber = (groups: Array<Record<string, unknown>> = []) => ({
  id: FAKE_SUBSCRIBER_ID,
  email: FAKE_EMAIL,
  status: "active",
  name: "Synthetic Person",
  fields: { country: "Synthetic Country", city: "Synthetic City" },
  groups,
  Authorization: FAKE_TOKEN,
  rawApiPayload: RAW_PAYLOAD,
});

const liveArgs = (paths: Record<string, string>) => [
  "--allow-live-packet-final-check",
  "--private-packet-json",
  paths.privatePacket,
  "--private-result-json",
  paths.privateResultJson,
  "--private-result-md",
  paths.privateResultMd,
  "--redacted-receipt-json",
  paths.receiptJson,
  "--redacted-receipt-md",
  paths.receiptMd,
];

const makeLivePaths = async () => {
  const { dir, roots } = await makeTempRoots();
  const paths = {
    privatePacket: join(roots.privateMailerLiteRoot, "packet.json"),
    privateResultJson: join(roots.privateMailerLiteRoot, "result.json"),
    privateResultMd: join(roots.privateMailerLiteRoot, "result.md"),
    receiptJson: join(roots.redactedReceiptRoot, "receipt.json"),
    receiptMd: join(roots.redactedReceiptRoot, "receipt.md"),
  };
  await writeFile(paths.privatePacket, `${JSON.stringify(packet(), null, 2)}\n`, "utf8");
  return { dir, roots, paths };
};

const runMockLive = async (lookupResult: Record<string, unknown>, packetOverrides: Record<string, unknown> = {}) => {
  const { dir, roots, paths } = await makeLivePaths();
  await writeFile(paths.privatePacket, `${JSON.stringify(packet(packetOverrides), null, 2)}
`, "utf8");
  let credentialCalls = 0;
  let clientCalls = 0;
  const effectiveLookupResult = {
    mailerlite_api_called: true,
    mailerlite_api_call_scope: PACKET_SPECIFIC_READONLY_SCOPE,
    ...lookupResult,
  };
  try {
    const receipt = await run(liveArgs(paths), {
      roots,
      credentialProvider: async () => {
        credentialCalls += 1;
        return { key: "mock-secret-value" };
      },
      finalCheckClient: {
        lookupSubscriberByEmail: async () => {
          clientCalls += 1;
          return effectiveLookupResult;
        },
      },
      runId: "crm_core_mailerlite_final_idempotency_suppression_check_test",
    });
    const receiptJsonText = await readFile(paths.receiptJson, "utf8");
    const receiptMdText = await readFile(paths.receiptMd, "utf8");
    const privateResultText = await readFile(paths.privateResultJson, "utf8");
    expectNoSensitiveStrings(receiptJsonText);
    expectNoSensitiveStrings(receiptMdText);
    expectNoSensitiveStrings(privateResultText);
    expect(paths.privateResultJson).toContain(tmpdir());
    return { receipt, credentialCalls, clientCalls };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
};

describe("CRM Core MailerLite final idempotency/suppression readonly guard", () => {
  test("fixture mode succeeds and writes redacted JSON/Markdown receipts", async () => {
    const dir = await mkdtemp(join(tmpdir(), "crm-core-mailerlite-final-fixture-"));
    try {
      const fixtureFile = join(dir, "fixture.json");
      const privateResultJson = join(dir, "private-result.json");
      const privateResultMd = join(dir, "private-result.md");
      const receiptJson = join(dir, "receipt.json");
      const receiptMd = join(dir, "receipt.md");
      await writeFile(fixtureFile, `${JSON.stringify({
        run_id: "crm_core_mailerlite_final_idempotency_suppression_check_fixture",
        packet: packet(),
        lookupResult: {
          subscriber_lookup_status: "found",
          records: [activeSubscriber([])],
        },
      }, null, 2)}\n`, "utf8");

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
      const receiptJsonText = await readFile(receiptJson, "utf8");
      const receiptMdText = await readFile(receiptMd, "utf8");
      const privateResultText = await readFile(privateResultJson, "utf8");
      const receipt = JSON.parse(receiptJsonText);

      expect(compact.ok).toBe(true);
      expect(compact.mailerlite_api_called).toBe(false);
      expect(receipt.route_status).toBe("fixture_mock_redaction_safe");
      expect(receipt.mutation_readiness_after_final_check).toBe("blocked_route_not_redaction_safe");
      expect(receipt.live_lookup_ran).toBe(false);
      expect(receipt.blockers).toContain("ready_state_without_completed_live_lookup");
      expectNoSensitiveStrings(`${stdout}\n${stderr}`);
      expectNoSensitiveStrings(receiptJsonText);
      expectNoSensitiveStrings(receiptMdText);
      expectNoSensitiveStrings(privateResultText);
      expect(privateResultJson).toContain(tmpdir());
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("live mode without explicit approval flag blocks before credential lookup", async () => {
    let credentialCalls = 0;
    await expect(run([], {
      credentialProvider: async () => {
        credentialCalls += 1;
        return { key: "mock" };
      },
    })).rejects.toThrow("live_packet_final_check_requires_explicit_approval");
    expect(credentialCalls).toBe(0);
  });

  test("invalid output path inside repo is rejected before credential lookup", async () => {
    const { dir, roots, paths } = await makeLivePaths();
    let credentialCalls = 0;
    try {
      const repoPath = join(process.cwd(), "tmp-private-result.json");
      await expect(run(liveArgs({ ...paths, privateResultJson: repoPath }), {
        roots,
        credentialProvider: async () => {
          credentialCalls += 1;
          return { key: "mock" };
        },
      })).rejects.toThrow("private_result_json_inside_repo_rejected");
      expect(credentialCalls).toBe(0);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("private packet outside approved MailerLite private root is rejected", async () => {
    const { dir, roots, paths } = await makeLivePaths();
    let credentialCalls = 0;
    try {
      const outsidePacket = join(dir, "outside-packet.json");
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

  test("private result outside approved MailerLite private root is rejected", async () => {
    const { dir, roots, paths } = await makeLivePaths();
    let credentialCalls = 0;
    try {
      await expect(run(liveArgs({ ...paths, privateResultMd: join(dir, "outside-result.md") }), {
        roots,
        credentialProvider: async () => {
          credentialCalls += 1;
          return { key: "mock" };
        },
      })).rejects.toThrow("private_result_md_outside_approved_root_rejected");
      expect(credentialCalls).toBe(0);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("redacted receipt outside controlled Mantis-Reports root is rejected", async () => {
    const { dir, roots, paths } = await makeLivePaths();
    let credentialCalls = 0;
    try {
      await expect(run(liveArgs({ ...paths, receiptJson: join(dir, "outside-receipt.json") }), {
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

  test("mocked live route with subscriber not found can classify safe under conservative rules", async () => {
    const { receipt, credentialCalls, clientCalls } = await runMockLive({ subscriber_lookup_status: "not_found", records: [] });
    expect(credentialCalls).toBe(1);
    expect(clientCalls).toBe(1);
    expect(receipt.route_status).toBe(COMPLETED_LIVE_ROUTE_STATUS);
    expect(receipt.mailerlite_api_called).toBe(true);
    expect(receipt.mailerlite_api_call_scope).toBe(PACKET_SPECIFIC_READONLY_SCOPE);
    expect(receipt.live_lookup_ran).toBe(true);
    expect(receipt.subscriber_lookup_status).toBe("not_found");
    expect(receipt.suppression_status).toBe("pass");
    expect(receipt.idempotency_status).toBe("pass");
    expect(receipt.mutation_readiness_after_final_check).toBe("ready_for_exact_mutation_approval");
  });

  test("ready state requires completed live route status", () => {
    const decision = buildDecision({
      packet: packet(),
      lookupResult: {
        subscriber_lookup_status: "found",
        records: [activeSubscriber([])],
        mailerlite_api_called: true,
        mailerlite_api_call_scope: PACKET_SPECIFIC_READONLY_SCOPE,
      },
      routeStatus: "fixture_mock_redaction_safe",
    });
    expect(decision.mutation_readiness_after_final_check).toBe("blocked_route_not_redaction_safe");
    expect(decision.blockers).toContain("ready_state_without_completed_live_lookup");
  });

  test("ready state requires the live lookup to report a MailerLite API call", async () => {
    const { dir, roots, paths } = await makeLivePaths();
    try {
      const receipt = await run(liveArgs(paths), {
        roots,
        credentialProvider: async () => ({ key: "mock-secret-value" }),
        finalCheckClient: {
          lookupSubscriberByEmail: async () => ({
            subscriber_lookup_status: "found",
            records: [activeSubscriber([])],
            mailerlite_api_called: false,
            mailerlite_api_call_scope: "not_called_mock_contract_violation",
          }),
        },
      });
      expect(receipt.route_status).toBe(COMPLETED_LIVE_ROUTE_STATUS);
      expect(receipt.mailerlite_api_called).toBe(false);
      expect(receipt.live_lookup_ran).toBe(false);
      expect(receipt.mutation_readiness_after_final_check).toBe("blocked_route_not_redaction_safe");
      expect(receipt.blockers).toContain("ready_state_without_completed_live_lookup");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("mocked live route with active subscriber not in onboarding group is ready", async () => {
    const { receipt } = await runMockLive({ subscriber_lookup_status: "found", records: [activeSubscriber([])] });
    expect(receipt.route_status).toBe(COMPLETED_LIVE_ROUTE_STATUS);
    expect(receipt.mailerlite_api_called).toBe(true);
    expect(receipt.mailerlite_api_call_scope).toBe(PACKET_SPECIFIC_READONLY_SCOPE);
    expect(receipt.live_lookup_ran).toBe(true);
    expect(receipt.subscriber_lookup_status).toBe("found");
    expect(receipt.subscriber_status_class).toBe("active");
    expect(receipt.onboarding_group_membership_status).toBe("absent");
    expect(receipt.duplicate_readd_status).toBe("safe_new_or_not_in_group");
    expect(receipt.mutation_readiness_after_final_check).toBe("ready_for_exact_mutation_approval");
  });

  test("mocked live route with active subscriber already in onboarding group blocks", async () => {
    const { receipt } = await runMockLive({
      subscriber_lookup_status: "found",
      records: [activeSubscriber([{ id: FAKE_GROUP_ID, name: DEFAULT_TARGET_GROUP_LABEL }])],
    });
    expect(receipt.onboarding_group_membership_status).toBe("present");
    expect(receipt.duplicate_readd_status).toBe("blocked_already_in_group_retrigger_unknown");
    expect(receipt.mutation_readiness_after_final_check).toBe("blocked_already_in_onboarding_group");
  });

  test("unsubscribed status blocks", async () => {
    const { receipt } = await runMockLive({ subscriber_lookup_status: "found", records: [{ ...activeSubscriber([]), status: "unsubscribed" }] });
    expect(receipt.subscriber_status_class).toBe("unsubscribed");
    expect(receipt.suppression_status).toBe("blocked");
    expect(receipt.mutation_readiness_after_final_check).toBe("blocked_suppression_status");
  });

  test("bounced status blocks", async () => {
    const { receipt } = await runMockLive({ subscriber_lookup_status: "found", records: [{ ...activeSubscriber([]), status: "bounced" }] });
    expect(receipt.subscriber_status_class).toBe("bounced");
    expect(receipt.mutation_readiness_after_final_check).toBe("blocked_suppression_status");
  });

  test("complained, junk, and suppressed statuses block", async () => {
    for (const record of [
      { ...activeSubscriber([]), status: "complained" },
      { ...activeSubscriber([]), status: "junk" },
      { ...activeSubscriber([]), status: "active", suppressed: true },
    ]) {
      const decision = buildDecision({ packet: packet(), lookupResult: { subscriber_lookup_status: "found", records: [record] } });
      expect(decision.suppression_status).toBe("blocked");
      expect(decision.mutation_readiness_after_final_check).toBe("blocked_suppression_status");
    }
  });

  test("ambiguous lookup blocks", async () => {
    const { receipt } = await runMockLive({ subscriber_lookup_status: "ambiguous", records: [activeSubscriber([]), activeSubscriber([])] });
    expect(receipt.subscriber_lookup_status).toBe("ambiguous");
    expect(receipt.mutation_readiness_after_final_check).toBe("blocked_lookup_ambiguous");
  });

  test("unknown subscriber status blocks", async () => {
    const { receipt } = await runMockLive({ subscriber_lookup_status: "found", records: [{ ...activeSubscriber([]), status: "mystery" }] });
    expect(receipt.subscriber_status_class).toBe("unknown");
    expect(receipt.mutation_readiness_after_final_check).toBe("blocked_subscriber_status_unknown");
  });

  test("missing private packet email anchor blocks consistently before credential or client lookup", async () => {
    const { dir, roots, paths } = await makeLivePaths();
    let credentialCalls = 0;
    let clientCalls = 0;
    try {
      await writeFile(paths.privatePacket, `${JSON.stringify(packet({ private_lookup: {}, private_email_anchor_label_present: true }))}
`, "utf8");
      const receipt = await run(liveArgs(paths), {
        roots,
        credentialProvider: async () => {
          credentialCalls += 1;
          return { key: "mock" };
        },
        finalCheckClient: {
          lookupSubscriberByEmail: async () => {
            clientCalls += 1;
            return { subscriber_lookup_status: "found", records: [activeSubscriber([])] };
          },
        },
      });
      const receiptJsonText = await readFile(paths.receiptJson, "utf8");
      const receiptMdText = await readFile(paths.receiptMd, "utf8");
      const receiptJson = JSON.parse(receiptJsonText);
      expect(credentialCalls).toBe(0);
      expect(clientCalls).toBe(0);
      expect(receipt.check_ran).toBe(false);
      expect(receipt.live_lookup_ran).toBe(false);
      expect(receipt.route_status).toBe(PRECHECK_MISSING_EMAIL_ROUTE_STATUS);
      expect(receipt.mailerlite_api_called).toBe(false);
      expect(receipt.mailerlite_api_call_scope).toBe(MISSING_EMAIL_SCOPE);
      expect(receipt.subscriber_lookup_status).toBe("blocked");
      expect(receipt.subscriber_status_class).toBe("unknown");
      expect(receipt.onboarding_group_membership_status).toBe("unknown");
      expect(receipt.duplicate_readd_status).toBe("unknown");
      expect(receipt.suppression_status).toBe("unknown");
      expect(receipt.idempotency_status).toBe("unknown");
      expect(receipt.mutation_readiness_after_final_check).toBe("blocked_missing_private_packet_email_anchor");
      expect(receipt.recommended_next_step).toBe("repair_private_packet_email_anchor_or_regenerate_no_write_packet");
      expect(receipt.blockers).toContain("missing_private_packet_email_anchor");
      expect(receiptJson.blockers).toContain("missing_private_packet_email_anchor");
      expect(receiptMdText).not.toContain("blockers: `none`");
      expectNoSensitiveStrings(receiptJsonText);
      expectNoSensitiveStrings(receiptMdText);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("POST, PUT, PATCH, and DELETE methods are rejected", () => {
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      expect(() => assertSafeFinalCheckRequest({ method, path: `/subscribers/${encodeURIComponent(FAKE_EMAIL)}` })).toThrow("blocked_route_not_redaction_safe");
    }
  });

  test("group assignment, field creation, automation mutation, and campaign endpoints are rejected", () => {
    for (const path of [
      `/subscribers/${FAKE_SUBSCRIBER_ID}/groups/${FAKE_GROUP_ID}`,
      "/groups/grp_fake_secret_123/subscribers",
      "/fields",
      "/automations/auto_fake_secret_456",
      "/campaigns",
      "/segments",
      "/forms",
      "/webhooks",
    ]) {
      expect(() => assertSafeFinalCheckRequest({ method: "GET", path })).toThrow("blocked_route_not_redaction_safe");
    }
  });

  test("mocked live client only calls the packet-specific subscriber lookup path", async () => {
    const calls: Array<Record<string, string>> = [];
    const client = createMailerLiteFinalCheckClient({
      options: { apiBase: "https://connect.mailerlite.test/api", timeoutMs: 1000 },
      key: "mock-secret",
      calls,
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ data: activeSubscriber([]) }),
      } as Response),
    });
    const result = await client.lookupSubscriberByEmail(FAKE_EMAIL);
    expect(result.mailerlite_api_called).toBe(true);
    expect(calls).toEqual([{ method: "GET", path: "/subscribers/<private-email-anchor>" }]);
    expect(calls.some((call) => /groups|fields|automations|campaigns/i.test(call.path))).toBe(false);
  });

  test("package.json contains the expected script and remains valid JSON", async () => {
    const packageJson = JSON.parse(await readFile(join(process.cwd(), "package.json"), "utf8"));
    expect(packageJson.scripts[EXPECTED_SCRIPT]).toBe("node scripts/crm-vnext-mailerlite-final-idempotency-suppression-check.mjs");
  });
});
