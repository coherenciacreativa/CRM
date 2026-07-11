import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, test } from "vitest";

import {
  ACTIVE_TRIGGER_CORRECTION_APPROVAL_CONTRACT_VERSION,
  ACTIVE_TRIGGER_CORRECTION_APPROVAL_PHRASE,
  CORRECTION_OPERATION_CLASS,
  CORRECTION_PACKET_CONTRACT_VERSION,
  GUARD_STATUS,
  assertAllowedCorrectionRequest,
  mutationAttemptLimiter,
  run,
  validateActiveTriggerCorrectionApprovalPhrase,
  validateActiveTriggerCorrectionPacket,
} from "../scripts/crm-vnext-mailerlite-existing-subscriber-active-trigger-correction.mjs";
import {
  ACTIVE_TRIGGER_CORRECTION_APPROVAL_CONTRACT_VERSION as SHARED_APPROVAL_VERSION,
  ACTIVE_TRIGGER_CORRECTION_APPROVAL_PHRASE as SHARED_APPROVAL_PHRASE,
} from "../scripts/crm-vnext-mailerlite-active-trigger-correction-approval-contract.mjs";
import {
  CORRECTION_PACKET_CONTRACT_VERSION as SHARED_PACKET_VERSION,
} from "../scripts/crm-vnext-mailerlite-active-trigger-correction-contract.mjs";

const execFileAsync = promisify(execFile);
const SCRIPT = "scripts/crm-vnext-mailerlite-existing-subscriber-active-trigger-correction.mjs";
const EXPECTED_SCRIPT = "crm:vnext:mailerlite-existing-subscriber-active-trigger-correction";
const FAKE_EMAIL = "person@example.test";
const FAKE_SUBSCRIBER_ID = "sub_fake_existing_001";
const FAKE_ACTIVE_GROUP = "grp_fake_active_trigger_001";
const FAKE_PRIOR_GROUP = "grp_fake_prior_non_active_002";
const FAKE_TOKEN = "Bearer fake_secret_token";
const RAW_PAYLOAD = "rawPayloadFixture";
const sensitiveStrings = [
  FAKE_EMAIL,
  FAKE_SUBSCRIBER_ID,
  FAKE_ACTIVE_GROUP,
  FAKE_PRIOR_GROUP,
  FAKE_TOKEN,
  RAW_PAYLOAD,
  "Authorization",
  "MAILERLITE_API_KEY",
  "credentialFingerprint",
];

const expectNoSensitiveStrings = (content: string) => {
  for (const value of sensitiveStrings) expect(content).not.toContain(value);
};

const packet = (overrides: Record<string, unknown> = {}) => ({
  packet_id: "crm_core_mailerlite_active_trigger_correction_packet_fixture",
  packet_contract_version: CORRECTION_PACKET_CONTRACT_VERSION,
  operation_class: CORRECTION_OPERATION_CLASS,
  private_lookup: {
    existing_subscriber_lookup_anchor: FAKE_EMAIL,
    active_live_trigger_group_reference: FAKE_ACTIVE_GROUP,
    prior_non_active_group_reference: FAKE_PRIOR_GROUP,
  },
  mismatch_confirmed: true,
  impact_on_e2e_result: "technical_e2e_completed_but_active_onboarding_not_verified",
  mutation_execution_status: "not_executed",
  crm_write_status: "not_written",
  consent_context_gate_status: "present_private_evidence",
  allowed_correction_scope: {
    add_only_active_live_trigger_group: true,
    preserve_existing_groups: true,
    no_group_removal: true,
    no_broad_import: true,
  },
  closed_gates: {
    no_group_removal: true,
    no_broad_import: true,
    no_field_creation: true,
    no_automation_or_campaign_mutation: true,
    no_crm_source_write: true,
  },
  syntheticPrivateFixture: {
    token: FAKE_TOKEN,
    rawPayload: RAW_PAYLOAD,
  },
  ...overrides,
});

const subscriber = (groups: string[], status = "active") => ({
  subscriber: {
    id: FAKE_SUBSCRIBER_ID,
    status,
    groups: groups.map((id) => ({ id })),
  },
});

const makeTempRoots = async () => {
  const dir = await mkdtemp(join(tmpdir(), "crm-core-mailerlite-active-trigger-correction-"));
  const roots = {
    repoRoot: process.cwd(),
    privateMailerLiteRoot: join(dir, "Mantis-Private-Source-Artifacts", "mailerlite"),
    redactedReceiptRoot: join(dir, "Mantis-Reports", "mailerlite", "controlled-welcome-flow"),
  };
  await mkdir(roots.privateMailerLiteRoot, { recursive: true });
  await mkdir(roots.redactedReceiptRoot, { recursive: true });
  return { dir, roots };
};

const makePaths = async (packetOverrides: Record<string, unknown> = {}) => {
  const { dir, roots } = await makeTempRoots();
  const paths = {
    approvalPhraseFile: join(dir, "approval.txt"),
    privatePacket: join(roots.privateMailerLiteRoot, "correction-packet.json"),
    privateResultJson: join(roots.privateMailerLiteRoot, "correction-result.json"),
    privateResultMd: join(roots.privateMailerLiteRoot, "correction-result.md"),
    receiptJson: join(roots.redactedReceiptRoot, "correction-receipt.json"),
    receiptMd: join(roots.redactedReceiptRoot, "correction-receipt.md"),
  };
  await writeFile(paths.approvalPhraseFile, `${ACTIVE_TRIGGER_CORRECTION_APPROVAL_PHRASE}\n`, "utf8");
  await writeFile(paths.privatePacket, `${JSON.stringify(packet(packetOverrides), null, 2)}\n`, "utf8");
  return { dir, roots, paths };
};

const liveArgs = (paths: Record<string, string>, approvalPhraseFile = paths.approvalPhraseFile) => [
  "--allow-live-existing-subscriber-active-trigger-correction",
  "--approval-phrase-file",
  approvalPhraseFile,
  "--private-correction-packet-json",
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

const preflightArgs = (paths: Record<string, string>) => [
  ...liveArgs(paths),
  "--preflight-only",
];

const makeClient = (responses: Array<Record<string, unknown>>, requests: Array<Record<string, unknown>>) => ({
  request: async (request: Record<string, unknown>) => {
    requests.push(request);
    if (request.method === "POST") return { ok: true };
    return responses.shift() ?? { subscriber_lookup_status: "not_found" };
  },
});

describe("CRM Core MailerLite existing-subscriber active-trigger correction guard", () => {
  test("contract modules export expected versions", () => {
    expect(CORRECTION_PACKET_CONTRACT_VERSION).toBe("mailerlite_existing_subscriber_active_trigger_correction_packet_v1");
    expect(CORRECTION_PACKET_CONTRACT_VERSION).toBe(SHARED_PACKET_VERSION);
    expect(ACTIVE_TRIGGER_CORRECTION_APPROVAL_CONTRACT_VERSION).toBe("mailerlite_active_trigger_correction_approval_phrase_v1_2026-07-11");
    expect(ACTIVE_TRIGGER_CORRECTION_APPROVAL_CONTRACT_VERSION).toBe(SHARED_APPROVAL_VERSION);
    expect(ACTIVE_TRIGGER_CORRECTION_APPROVAL_PHRASE).toBe(SHARED_APPROVAL_PHRASE);
    expect(GUARD_STATUS).toBe("implemented_and_mock_tested");
  });

  test("approval template mode prints canonical template safely and does not call dependencies", async () => {
    const direct = await run(["--print-approval-template"], {
      credentialProvider: async () => { throw new Error("credential_provider_called"); },
      correctionClient: { request: async () => { throw new Error("network_client_called"); } },
    });
    expect(direct.approval_template_printed).toBe(true);
    const { stdout, stderr } = await execFileAsync("node", [SCRIPT, "--print-approval-template"], { cwd: process.cwd() });
    const payload = JSON.parse(stdout);
    expect(payload.contract_version).toBe(ACTIVE_TRIGGER_CORRECTION_APPROVAL_CONTRACT_VERSION);
    expect(payload.approval_phrase).toBe(ACTIVE_TRIGGER_CORRECTION_APPROVAL_PHRASE);
    expectNoSensitiveStrings(`${stdout}\n${stderr}`);
  });

  test("exact phrase validation passes and paraphrased phrase blocks", async () => {
    expect(validateActiveTriggerCorrectionApprovalPhrase(ACTIVE_TRIGGER_CORRECTION_APPROVAL_PHRASE).ok).toBe(true);
    expect(validateActiveTriggerCorrectionApprovalPhrase("I approve the same thing").reason).toBe("blocked_approval_phrase_mismatch");
    const { dir, roots, paths } = await makePaths();
    let credentialCalls = 0;
    try {
      await writeFile(paths.approvalPhraseFile, "I approve the same thing\n", "utf8");
      await expect(run(liveArgs(paths), { roots, credentialProvider: async () => { credentialCalls += 1; return { key: "mock" }; } })).rejects.toThrow("blocked_approval_phrase_mismatch");
      expect(credentialCalls).toBe(0);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("missing phrase blocks before credentials", async () => {
    const { dir, roots, paths } = await makePaths();
    let credentialCalls = 0;
    try {
      await rm(paths.approvalPhraseFile, { force: true });
      await expect(run(liveArgs(paths), { roots, credentialProvider: async () => { credentialCalls += 1; return { key: "mock" }; } })).rejects.toThrow("blocked_approval_phrase_missing");
      expect(credentialCalls).toBe(0);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("packet validator rejects unsafe or incomplete packets", () => {
    expect(validateActiveTriggerCorrectionPacket(packet()).ok).toBe(true);
    expect(validateActiveTriggerCorrectionPacket(packet({ operation_class: "subscriber_upsert_then_add_to_confirmed_onboarding_group_if_final_checks_pass" })).reason).toBe("blocked_private_packet_operation_class_mismatch");
    expect(validateActiveTriggerCorrectionPacket(packet({ private_lookup: { active_live_trigger_group_reference: FAKE_ACTIVE_GROUP, prior_non_active_group_reference: FAKE_PRIOR_GROUP } })).reason).toBe("blocked_missing_existing_subscriber_lookup_anchor");
    expect(validateActiveTriggerCorrectionPacket(packet({ private_lookup: { existing_subscriber_lookup_anchor: FAKE_EMAIL, prior_non_active_group_reference: FAKE_PRIOR_GROUP } })).reason).toBe("blocked_active_trigger_reference_missing");
    expect(validateActiveTriggerCorrectionPacket(packet({ private_lookup: { existing_subscriber_lookup_anchor: FAKE_EMAIL, active_live_trigger_group_reference: FAKE_ACTIVE_GROUP, prior_non_active_group_reference: FAKE_ACTIVE_GROUP } })).reason).toBe("blocked_active_and_prior_group_reference_identical");
    expect(validateActiveTriggerCorrectionPacket(packet({ authorizes_group_removal: true })).reason).toBe("blocked_private_packet_authorizes_disallowed_mutation");
    expect(validateActiveTriggerCorrectionPacket(packet({ authorizes_broad_import: true })).reason).toBe("blocked_private_packet_authorizes_disallowed_mutation");
    expect(validateActiveTriggerCorrectionPacket(packet({ mutation_execution_status: "executed" })).reason).toBe("blocked_private_packet_already_executed_or_unknown");
  });

  test("output paths inside repo block before credentials", async () => {
    const { dir, roots, paths } = await makePaths();
    let credentialCalls = 0;
    try {
      await expect(run(liveArgs({ ...paths, privateResultJson: join(process.cwd(), "private-result.json") }), { roots, credentialProvider: async () => { credentialCalls += 1; return { key: "mock" }; } })).rejects.toThrow("blocked_output_path_policy");
      expect(credentialCalls).toBe(0);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("preflight-only passes canonical synthetic packet without credentials, network, or mutation", async () => {
    const { dir, roots, paths } = await makePaths();
    let credentialCalls = 0;
    let networkCalls = 0;
    try {
      const receipt = await run(preflightArgs(paths), {
        roots,
        credentialProvider: async () => { credentialCalls += 1; return { key: "mock" }; },
        correctionClient: { request: async () => { networkCalls += 1; return { ok: true }; } },
      });
      expect(receipt.correction_result_status).toBe("preflight_only_ready_for_exact_active_trigger_correction_approval");
      expect(receipt.correction_attempted).toBe(false);
      expect(receipt.correction_executed).toBe(false);
      expect(credentialCalls).toBe(0);
      expect(networkCalls).toBe(0);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("mocked live route fetches once before mutation and verifies after", async () => {
    const { dir, roots, paths } = await makePaths();
    const requests: Array<Record<string, unknown>> = [];
    let credentialCalls = 0;
    try {
      const receipt = await run(liveArgs(paths), {
        roots,
        credentialProvider: async () => { credentialCalls += 1; return { key: "mock" }; },
        correctionClient: makeClient([subscriber([FAKE_PRIOR_GROUP]), subscriber([FAKE_PRIOR_GROUP, FAKE_ACTIVE_GROUP])], requests),
      });
      expect(receipt.correction_result_status).toBe("correction_executed_verified");
      expect(receipt.mutation_endpoint_call_count).toBe(1);
      expect(requests.map((request) => request.method)).toEqual(["GET", "POST", "GET"]);
      expect(requests.slice(0, 1).filter((request) => request.method === "GET")).toHaveLength(1);
      expect(credentialCalls).toBe(1);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("subscriber not found blocks with zero mutation calls", async () => {
    const { dir, roots, paths } = await makePaths();
    const requests: Array<Record<string, unknown>> = [];
    try {
      const receipt = await run(liveArgs(paths), {
        roots,
        credentialProvider: async () => ({ key: "mock" }),
        correctionClient: makeClient([{ subscriber_lookup_status: "not_found" }], requests),
      });
      expect(receipt.correction_result_status).toBe("blocked_subscriber_not_found");
      expect(receipt.mutation_endpoint_call_count).toBe(0);
      expect(requests.map((request) => request.method)).toEqual(["GET"]);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("unsafe subscriber statuses block with zero mutation calls", async () => {
    for (const status of ["unsubscribed", "bounced", "junk", "inactive"]) {
      const { dir, roots, paths } = await makePaths();
      const requests: Array<Record<string, unknown>> = [];
      try {
        const receipt = await run(liveArgs(paths), {
          roots,
          credentialProvider: async () => ({ key: "mock" }),
          correctionClient: makeClient([subscriber([FAKE_PRIOR_GROUP], status)], requests),
        });
        expect(receipt.correction_result_status).toBe("blocked_subscriber_status_unsafe_or_suppressed");
        expect(receipt.mutation_endpoint_call_count).toBe(0);
      } finally { await rm(dir, { recursive: true, force: true }); }
    }
  });

  test("already-present active trigger returns idempotent no-op with zero mutation calls", async () => {
    const { dir, roots, paths } = await makePaths();
    const requests: Array<Record<string, unknown>> = [];
    try {
      const receipt = await run(liveArgs(paths), {
        roots,
        credentialProvider: async () => ({ key: "mock" }),
        correctionClient: makeClient([subscriber([FAKE_PRIOR_GROUP, FAKE_ACTIVE_GROUP])], requests),
      });
      expect(receipt.correction_result_status).toBe("already_present_idempotent_noop");
      expect(receipt.correction_executed).toBe(false);
      expect(receipt.mutation_endpoint_call_count).toBe(0);
      expect(requests.map((request) => request.method)).toEqual(["GET"]);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("active trigger absent performs exactly one POST assignment and preserves prior group", async () => {
    const { dir, roots, paths } = await makePaths();
    const requests: Array<Record<string, unknown>> = [];
    try {
      const receipt = await run(liveArgs(paths), {
        roots,
        credentialProvider: async () => ({ key: "mock" }),
        correctionClient: makeClient([subscriber([FAKE_PRIOR_GROUP]), subscriber([FAKE_PRIOR_GROUP, FAKE_ACTIVE_GROUP])], requests),
      });
      const postRequests = requests.filter((request) => request.method === "POST");
      expect(postRequests).toHaveLength(1);
      expect(postRequests[0].path).toBe(`/api/subscribers/${FAKE_SUBSCRIBER_ID}/groups/${FAKE_ACTIVE_GROUP}`);
      expect(postRequests[0]).not.toHaveProperty("status");
      expect(postRequests[0]).not.toHaveProperty("resubscribe");
      expect(postRequests[0].payload).toBeNull();
      expect(receipt.prior_non_active_group_preservation_status).toBe("present_preserved");
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("post-correction verification must observe active trigger present", async () => {
    const { dir, roots, paths } = await makePaths();
    const requests: Array<Record<string, unknown>> = [];
    try {
      const receipt = await run(liveArgs(paths), {
        roots,
        credentialProvider: async () => ({ key: "mock" }),
        correctionClient: makeClient([subscriber([FAKE_PRIOR_GROUP]), subscriber([FAKE_PRIOR_GROUP])], requests),
      });
      expect(receipt.correction_result_status).toBe("blocked_post_correction_verification_failed");
      expect(receipt.post_correction_verification_status).toBe("failed");
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("endpoint allowlist blocks unsafe routes", () => {
    expect(() => assertAllowedCorrectionRequest({ method: "GET", path: "/api/subscribers" })).toThrow("blocked_broad_subscriber_list_endpoint");
    expect(() => assertAllowedCorrectionRequest({ method: "POST", path: "/api/subscribers" })).toThrow("blocked_subscriber_upsert_endpoint_for_correction");
    expect(() => assertAllowedCorrectionRequest({ method: "PUT", path: `/api/subscribers/${FAKE_SUBSCRIBER_ID}` })).toThrow("blocked_put_subscriber_update_endpoint");
    expect(() => assertAllowedCorrectionRequest({ method: "DELETE", path: `/api/subscribers/${FAKE_SUBSCRIBER_ID}/groups/${FAKE_ACTIVE_GROUP}` })).toThrow("blocked_group_unassign_endpoint");
    expect(() => assertAllowedCorrectionRequest({ method: "GET", path: `/api/groups/${FAKE_ACTIVE_GROUP}/subscribers` })).toThrow("blocked_group_subscriber_export_endpoint");
    expect(() => assertAllowedCorrectionRequest({ method: "POST", path: `/api/groups/${FAKE_ACTIVE_GROUP}/import-subscribers` })).toThrow("blocked_bulk_import_endpoint");
    expect(() => assertAllowedCorrectionRequest({ method: "POST", path: "/api/fields" })).toThrow("blocked_field_endpoint");
    expect(() => assertAllowedCorrectionRequest({ method: "POST", path: "/api/automations" })).toThrow("blocked_automation_endpoint");
    expect(() => assertAllowedCorrectionRequest({ method: "POST", path: "/api/campaigns" })).toThrow("blocked_campaign_endpoint");
    expect(() => assertAllowedCorrectionRequest({ method: "POST", path: "/api/segments" })).toThrow("blocked_segment_endpoint");
    expect(() => assertAllowedCorrectionRequest({ method: "POST", path: "/api/forms" })).toThrow("blocked_form_endpoint");
    expect(() => assertAllowedCorrectionRequest({ method: "POST", path: "/api/webhooks" })).toThrow("blocked_webhook_endpoint");
    expect(() => assertAllowedCorrectionRequest({ method: "PATCH", path: "/api/account/settings" })).toThrow("blocked_account_settings_endpoint");
    expect(assertAllowedCorrectionRequest({ method: "GET", path: `/api/subscribers/${FAKE_EMAIL}` })).toBe(true);
    expect(assertAllowedCorrectionRequest({ method: "POST", path: `/api/subscribers/${FAKE_SUBSCRIBER_ID}/groups/${FAKE_ACTIVE_GROUP}` })).toBe(true);
  });

  test("second mutation attempt is blocked by limiter", () => {
    const limiter = mutationAttemptLimiter();
    limiter.assertAndCount({ method: "POST", path: `/api/subscribers/${FAKE_SUBSCRIBER_ID}/groups/${FAKE_ACTIVE_GROUP}` });
    expect(() => limiter.assertAndCount({ method: "POST", path: `/api/subscribers/${FAKE_SUBSCRIBER_ID}/groups/${FAKE_ACTIVE_GROUP}` })).toThrow("blocked_multiple_mutation_attempts");
  });

  test("credentials and network are called only after all local prechecks", async () => {
    const { dir, roots, paths } = await makePaths({ operation_class: "unsafe" });
    let credentialCalls = 0;
    let networkCalls = 0;
    try {
      await expect(run(liveArgs(paths), {
        roots,
        credentialProvider: async () => { credentialCalls += 1; return { key: "mock" }; },
        correctionClient: { request: async () => { networkCalls += 1; return { ok: true }; } },
      })).rejects.toThrow("blocked_private_packet_contract_invalid");
      expect(credentialCalls).toBe(0);
      expect(networkCalls).toBe(0);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("redacted JSON, Markdown, stdout and stderr contain no synthetic private values", async () => {
    const { dir, roots, paths } = await makePaths();
    const requests: Array<Record<string, unknown>> = [];
    try {
      const receipt = await run(liveArgs(paths), {
        roots,
        credentialProvider: async () => ({ key: "mock" }),
        correctionClient: makeClient([subscriber([FAKE_PRIOR_GROUP]), subscriber([FAKE_PRIOR_GROUP, FAKE_ACTIVE_GROUP])], requests),
      });
      expect(receipt.correction_result_status).toBe("correction_executed_verified");
      expectNoSensitiveStrings(await readFile(paths.receiptJson, "utf8"));
      expectNoSensitiveStrings(await readFile(paths.receiptMd, "utf8"));
      const { stdout, stderr } = await execFileAsync("node", [SCRIPT, "--print-approval-template"], { cwd: process.cwd() });
      expectNoSensitiveStrings(`${stdout}\n${stderr}`);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("private results are written only to approved private or tmp fixture paths", async () => {
    const { dir, roots, paths } = await makePaths();
    try {
      await run(liveArgs(paths), {
        roots,
        credentialProvider: async () => ({ key: "mock" }),
        correctionClient: makeClient([subscriber([FAKE_PRIOR_GROUP]), subscriber([FAKE_PRIOR_GROUP, FAKE_ACTIVE_GROUP])], []),
      });
      expect(paths.privateResultJson).toContain(tmpdir());
      expect(paths.privateResultMd).toContain(tmpdir());
      expect(paths.receiptJson).toContain(tmpdir());
      expect(paths.receiptMd).toContain(tmpdir());
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("package.json remains valid and package-lock is unchanged", async () => {
    const pkg = JSON.parse(await readFile(join(process.cwd(), "package.json"), "utf8"));
    expect(pkg.scripts[EXPECTED_SCRIPT]).toBe("node scripts/crm-vnext-mailerlite-existing-subscriber-active-trigger-correction.mjs");
    const { stdout } = await execFileAsync("git", ["diff", "--name-only", "--", "package-lock.json"], { cwd: process.cwd() });
    expect(stdout.trim()).toBe("");
  });
});
