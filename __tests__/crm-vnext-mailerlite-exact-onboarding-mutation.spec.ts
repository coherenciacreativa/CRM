import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, test } from "vitest";

import {
  COMPLETED_FINAL_CHECK_ROUTE_STATUS,
  EXACT_MUTATION_GUARD_STATUS,
  EXACT_ONBOARDING_MUTATION_APPROVAL_CONTRACT_VERSION,
  EXACT_ONBOARDING_MUTATION_APPROVAL_PHRASE,
  FUTURE_EXACT_APPROVAL_PHRASE,
  SAFE_MUTATION_CLIENT_CONTRACT,
  assertAllowedExactMutationRequest,
  buildExactMutationPayload,
  run,
  validateFinalCheckReceipt,
} from "../scripts/crm-vnext-mailerlite-exact-onboarding-mutation.mjs";
import {
  PACKET_SPECIFIC_READONLY_SCOPE,
  run as runFinalCheck,
} from "../scripts/crm-vnext-mailerlite-final-idempotency-suppression-check.mjs";
import {
  FINAL_CHECK_READY_RECEIPT_CONTRACT_VERSION,
  validateFinalCheckReadyReceipt as validateSharedFinalCheckReadyReceipt,
} from "../scripts/crm-vnext-mailerlite-final-check-receipt-contract.mjs";
import {
  EXACT_ONBOARDING_MUTATION_APPROVAL_CONTRACT_VERSION as SHARED_APPROVAL_CONTRACT_VERSION,
  EXACT_ONBOARDING_MUTATION_APPROVAL_PHRASE as SHARED_APPROVAL_PHRASE,
  validateExactOnboardingMutationApprovalPhrase as validateSharedApprovalPhrase,
} from "../scripts/crm-vnext-mailerlite-exact-mutation-approval-contract.mjs";

const execFileAsync = promisify(execFile);
const SCRIPT = "scripts/crm-vnext-mailerlite-exact-onboarding-mutation.mjs";
const EXPECTED_SCRIPT = "crm:vnext:mailerlite-exact-onboarding-mutation";
const NOW_MS = Date.parse("2026-07-07T12:00:00.000Z");
const FRESH_CHECKED_AT = "2026-07-07T11:59:00.000Z";
const OLD_CHECKED_AT = "2026-07-07T10:00:00.000Z";
const FAKE_EMAIL = "person@example.test";
const FAKE_SUBSCRIBER_ID = "sub_fake_secret_000";
const FAKE_GROUP_ID = "grp_fake_secret_123";
const FAKE_CONFIRMED_GROUP_REFERENCE = "grp_fake_confirmed_onboarding_123";
const FAKE_AUTO_ID = "auto_fake_secret_456";
const FAKE_FIELD_ID = "fld_fake_secret_789";
const FAKE_TOKEN = "Bearer fake_secret_token";
const RAW_PAYLOAD = "rawApiPayload";
const PRIVATE_MESSAGE = "private message text fixture";
const sensitiveStrings = [
  FAKE_EMAIL,
  FAKE_SUBSCRIBER_ID,
  FAKE_GROUP_ID,
  FAKE_CONFIRMED_GROUP_REFERENCE,
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
  for (const value of sensitiveStrings) expect(content).not.toContain(value);
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
  operation_class: "subscriber_upsert_then_add_to_confirmed_onboarding_group_if_final_checks_pass",
  top_level_email_semantics: "native_top_level_subscriber_email_required",
  consent_context_gate_status: "present_private_evidence",
  mutation_execution_status: "not_executed",
  final_idempotency_check_required: true,
  final_suppression_check_required: true,
  private_lookup: { email: FAKE_EMAIL },
  confirmed_onboarding_group_reference: FAKE_CONFIRMED_GROUP_REFERENCE,
  mapped_field_families: ["name", "country", "city"],
  fields: {
    name: "Synthetic Person",
    country: "Synthetic Country",
    city: "Synthetic City",
    source_channel: "must-not-map",
  },
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
  checked_at: FRESH_CHECKED_AT,
  receipt_contract_version: FINAL_CHECK_READY_RECEIPT_CONTRACT_VERSION,
  receipt_contract_check: "passed",
  receipt_contract_check_result: "passed_ready_contract",
  receipt_consistency_check: "passed",
  freshness_timestamp_status: "valid_iso8601_present",
  route_status: COMPLETED_FINAL_CHECK_ROUTE_STATUS,
  live_lookup_ran: true,
  mailerlite_api_called: true,
  mailerlite_api_call_scope: "packet_specific_subscriber_status_group_membership_readonly",
  subscriber_lookup_status: "not_found",
  subscriber_status_class: "not_found",
  onboarding_group_membership_status: "not_found",
  duplicate_readd_status: "safe_new_or_not_in_group",
  suppression_status: "pass",
  idempotency_status: "pass",
  mutation_readiness_after_final_check: "ready_for_exact_mutation_approval",
  blockers: [],
  ...overrides,
});

const makeLivePaths = async (packetOverrides: Record<string, unknown> = {}, finalOverrides: Record<string, unknown> = {}) => {
  const { dir, roots } = await makeTempRoots();
  const paths = {
    approvalPhraseFile: join(dir, "approval.txt"),
    privatePacket: join(roots.privateMailerLiteRoot, "packet.json"),
    finalCheck: join(roots.redactedReceiptRoot, "final-check.json"),
    finalCheckReceiptMd: join(roots.redactedReceiptRoot, "final-check.md"),
    finalCheckPrivateResultJson: join(roots.privateMailerLiteRoot, "final-check-private-result.json"),
    finalCheckPrivateResultMd: join(roots.privateMailerLiteRoot, "final-check-private-result.md"),
    privateResultJson: join(roots.privateMailerLiteRoot, "mutation-result.json"),
    privateResultMd: join(roots.privateMailerLiteRoot, "mutation-result.md"),
    receiptJson: join(roots.redactedReceiptRoot, "mutation-receipt.json"),
    receiptMd: join(roots.redactedReceiptRoot, "mutation-receipt.md"),
  };
  await writeFile(paths.approvalPhraseFile, `${FUTURE_EXACT_APPROVAL_PHRASE}\n`, "utf8");
  await writeFile(paths.privatePacket, `${JSON.stringify(packet(packetOverrides), null, 2)}\n`, "utf8");
  await writeFile(paths.finalCheck, `${JSON.stringify(safeFinalCheck(finalOverrides), null, 2)}\n`, "utf8");
  return { dir, roots, paths };
};

const liveArgs = (paths: Record<string, string>, approvalFile = paths.approvalPhraseFile) => [
  "--allow-live-exact-onboarding-mutation",
  "--approval-phrase-file",
  approvalFile,
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
  "--max-final-check-age-ms",
  "900000",
];

const preflightArgs = (paths: Record<string, string>) => [
  ...liveArgs(paths),
  "--preflight-only",
];

const finalCheckLiveArgs = (paths: Record<string, string>) => [
  "--allow-live-packet-final-check",
  "--private-packet-json",
  paths.privatePacket,
  "--private-result-json",
  paths.finalCheckPrivateResultJson,
  "--private-result-md",
  paths.finalCheckPrivateResultMd,
  "--redacted-receipt-json",
  paths.finalCheck,
  "--redacted-receipt-md",
  paths.finalCheckReceiptMd,
];

const runMockedLive = async (packetOverrides: Record<string, unknown> = {}, finalOverrides: Record<string, unknown> = {}) => {
  const { dir, roots, paths } = await makeLivePaths(packetOverrides, finalOverrides);
  const requests: Array<Record<string, unknown>> = [];
  let credentialCalls = 0;
  try {
    const receipt = await run(liveArgs(paths), {
      roots,
      nowMs: NOW_MS,
      credentialProvider: async () => {
        credentialCalls += 1;
        return { key: "mock-secret-value" };
      },
      exactMutationClient: {
        request: async (request: Record<string, unknown>) => {
          requests.push(request);
          return { ok: true, status: 200, response_status_class: "mock_success_no_raw_body_recorded" };
        },
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
    return { receipt, requests, credentialCalls, paths, dir };
  } catch (error) {
    await rm(dir, { recursive: true, force: true });
    throw error;
  }
};

describe("CRM Core MailerLite exact onboarding mutation execution guard", () => {
  test("canonical approval contract module exports version and expected exact phrase", () => {
    expect(SHARED_APPROVAL_CONTRACT_VERSION).toBeTruthy();
    expect(EXACT_ONBOARDING_MUTATION_APPROVAL_CONTRACT_VERSION).toBe(SHARED_APPROVAL_CONTRACT_VERSION);
    expect(SHARED_APPROVAL_PHRASE).toBe(EXACT_ONBOARDING_MUTATION_APPROVAL_PHRASE);
    expect(FUTURE_EXACT_APPROVAL_PHRASE).toBe(SHARED_APPROVAL_PHRASE);
    expect(SHARED_APPROVAL_PHRASE).toContain("mailerlite_final_check_ready_receipt_v1");
    expect(SHARED_APPROVAL_PHRASE).toContain("group-reference-repaired private onboarding packet");
  });

  test("exact mutation guard uses the shared approval contract validator", () => {
    expect(validateSharedApprovalPhrase(SHARED_APPROVAL_PHRASE).ok).toBe(true);
    expect(validateSharedApprovalPhrase("I approve a paraphrased mutation").reason).toBe("not_run_approval_phrase_contract_mismatch");
  });

  test("approval template mode prints canonical phrase and no private values", async () => {
    const { stdout, stderr } = await execFileAsync("node", [SCRIPT, "--print-approval-template"], { cwd: process.cwd() });
    const payload = JSON.parse(stdout);
    expect(payload.contract_version).toBe(SHARED_APPROVAL_CONTRACT_VERSION);
    expect(payload.approval_phrase).toBe(SHARED_APPROVAL_PHRASE);
    expectNoSensitiveStrings(`${stdout}\n${stderr}`);
  });

  test("approval template mode does not call credentials, network, or mutate", async () => {
    const result = await run(["--print-approval-template"], {
      credentialProvider: async () => { throw new Error("credential_provider_called"); },
      exactMutationClient: { request: async () => { throw new Error("network_client_called"); } },
    });
    expect(result.ok).toBe(true);
    expect(result.approval_template_printed).toBe(true);
  });

  test("approval validation mode accepts exact canonical phrase without live paths", async () => {
    const dir = await mkdtemp(join(tmpdir(), "crm-core-mailerlite-approval-contract-"));
    try {
      const phrasePath = join(dir, "approval.txt");
      await writeFile(phrasePath, `${SHARED_APPROVAL_PHRASE}\n`, "utf8");
      const result = await run(["--validate-approval-phrase-file", phrasePath], {
        credentialProvider: async () => { throw new Error("credential_provider_called"); },
        exactMutationClient: { request: async () => { throw new Error("network_client_called"); } },
      });
      expect(result.ok).toBe(true);
      expect(result.status).toBe("passed_exact_approval_phrase_contract");
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("old prompt phrase variant blocks before credential provider", async () => {
    const { dir, roots, paths } = await makeLivePaths();
    let credentialCalls = 0;
    try {
      const oldPhrase = "I approve CRM Core to execute one MailerLite onboarding mutation for the explicitly approved repaired private onboarding packet only, using the implemented exact mutation execution guard and the fresh v4 final-check receipt.";
      await writeFile(paths.approvalPhraseFile, `${oldPhrase}\n`, "utf8");
      await expect(run(liveArgs(paths), { roots, credentialProvider: async () => { credentialCalls += 1; return { key: "mock" }; } })).rejects.toThrow("not_run_approval_phrase_contract_mismatch");
      expect(credentialCalls).toBe(0);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("paraphrased approval phrase blocks before credential provider", async () => {
    const { dir, roots, paths } = await makeLivePaths();
    let credentialCalls = 0;
    try {
      await writeFile(paths.approvalPhraseFile, "I approve the MailerLite mutation with the same safeguards.\n", "utf8");
      await expect(run(liveArgs(paths), { roots, credentialProvider: async () => { credentialCalls += 1; return { key: "mock" }; } })).rejects.toThrow("not_run_approval_phrase_contract_mismatch");
      expect(credentialCalls).toBe(0);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("approval phrase with extra or missing material blocks before credential provider", async () => {
    const { dir, roots, paths } = await makeLivePaths();
    let credentialCalls = 0;
    try {
      await writeFile(paths.approvalPhraseFile, `${SHARED_APPROVAL_PHRASE} Extra approval text.\n`, "utf8");
      await expect(run(liveArgs(paths), { roots, credentialProvider: async () => { credentialCalls += 1; return { key: "mock" }; } })).rejects.toThrow("not_run_approval_phrase_contract_mismatch");
      await writeFile(paths.approvalPhraseFile, `${SHARED_APPROVAL_PHRASE.replace("and write only private result artifacts plus redacted aggregate receipts.", "")}\n`, "utf8");
      await expect(run(liveArgs(paths), { roots, credentialProvider: async () => { credentialCalls += 1; return { key: "mock" }; } })).rejects.toThrow("not_run_approval_phrase_contract_mismatch");
      expect(credentialCalls).toBe(0);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });
  test("fixture/mock mode succeeds and writes redacted JSON/Markdown receipts", async () => {
    const dir = await mkdtemp(join(tmpdir(), "crm-core-mailerlite-exact-fixture-"));
    try {
      const fixtureFile = join(dir, "fixture.json");
      const privateResultJson = join(dir, "private-result.json");
      const privateResultMd = join(dir, "private-result.md");
      const receiptJson = join(dir, "receipt.json");
      const receiptMd = join(dir, "receipt.md");
      await writeFile(fixtureFile, `${JSON.stringify({ packet: packet(), finalCheckReceipt: safeFinalCheck({ checked_at: new Date().toISOString() }) }, null, 2)}\n`, "utf8");

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

  test("scaffold blocker is removed when safe client contract is available", async () => {
    const { receipt, credentialCalls, requests, dir } = await runMockedLive();
    try {
      expect(EXACT_MUTATION_GUARD_STATUS).toBe("exact_mutation_execution_guard_implemented_mocked_live_tested");
      expect(SAFE_MUTATION_CLIENT_CONTRACT).toBe("post_subscribers_only_current_not_found_path");
      expect(receipt.blockers).toEqual([]);
      expect(receipt.recommended_next_step).toBe("central_integration_of_exact_mutation_execution_guard");
      expect(credentialCalls).toBe(1);
      expect(requests).toHaveLength(1);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("shared final-check ready receipt contract accepts canonical receipt", () => {
    const result = validateSharedFinalCheckReadyReceipt(safeFinalCheck(), { nowMs: NOW_MS });
    expect(result.ok).toBe(true);
    expect(result.status).toBe("passed_fresh_packet_specific_final_check");
  });

  test("preflight-only accepts canonical final check without credentials or network", async () => {
    const { dir, roots, paths } = await makeLivePaths();
    let credentialCalls = 0;
    let networkCalls = 0;
    try {
      const receipt = await run(preflightArgs(paths), {
        roots,
        nowMs: NOW_MS,
        credentialProvider: async () => { credentialCalls += 1; return { key: "mock" }; },
        exactMutationClient: { request: async () => { networkCalls += 1; return { ok: true }; } },
      });
      expect(receipt.mutation_attempted).toBe(false);
      expect(receipt.mutation_executed).toBe(false);
      expect(receipt.mutation_result_status).toBe("preflight_only_ready_for_exact_mutation_approval");
      expect(credentialCalls).toBe(0);
      expect(networkCalls).toBe(0);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("producer-to-consumer contract: final-check writer output passes mutation preflight-only", async () => {
    const { dir, roots, paths } = await makeLivePaths();
    let finalCheckCredentialCalls = 0;
    let mutationCredentialCalls = 0;
    let networkCalls = 0;
    try {
      await runFinalCheck(finalCheckLiveArgs(paths), {
        roots,
        completedAt: FRESH_CHECKED_AT,
        runId: "crm_core_mailerlite_final_check_producer_contract_test",
        credentialProvider: async () => {
          finalCheckCredentialCalls += 1;
          return { key: "mock-secret-value" };
        },
        finalCheckClient: {
          lookupSubscriberByEmail: async () => ({
            subscriber_lookup_status: "not_found",
            records: [],
            mailerlite_api_called: true,
            mailerlite_api_call_scope: PACKET_SPECIFIC_READONLY_SCOPE,
          }),
        },
      });
      const producedReceiptText = await readFile(paths.finalCheck, "utf8");
      const producedReceipt = JSON.parse(producedReceiptText);
      expect(producedReceipt.receipt_contract_version).toBe(FINAL_CHECK_READY_RECEIPT_CONTRACT_VERSION);
      expect(producedReceipt.receipt_contract_check_result).toBe("passed_ready_contract");
      expectNoSensitiveStrings(producedReceiptText);

      const preflightReceipt = await run(preflightArgs(paths), {
        roots,
        nowMs: NOW_MS,
        credentialProvider: async () => { mutationCredentialCalls += 1; return { key: "mock-secret-value" }; },
        exactMutationClient: { request: async () => { networkCalls += 1; return { ok: true }; } },
        runId: "crm_core_mailerlite_exact_mutation_preflight_contract_test",
      });
      expect(finalCheckCredentialCalls).toBe(1);
      expect(preflightReceipt.mutation_result_status).toBe("preflight_only_ready_for_exact_mutation_approval");
      expect(preflightReceipt.mutation_attempted).toBe(false);
      expect(preflightReceipt.mutation_executed).toBe(false);
      expect(mutationCredentialCalls).toBe(0);
      expect(networkCalls).toBe(0);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("live mode without explicit approval blocks before credential provider", async () => {
    let credentialCalls = 0;
    await expect(run([], { credentialProvider: async () => { credentialCalls += 1; return { key: "mock" }; } })).rejects.toThrow("not_run_missing_approval");
    expect(credentialCalls).toBe(0);
  });

  test("exact approval phrase absent blocks before credential provider", async () => {
    const { dir, roots, paths } = await makeLivePaths();
    let credentialCalls = 0;
    try {
      await rm(paths.approvalPhraseFile, { force: true });
      await expect(run(liveArgs(paths), { roots, credentialProvider: async () => { credentialCalls += 1; return { key: "mock" }; } })).rejects.toThrow();
      expect(credentialCalls).toBe(0);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("exact approval phrase mismatch blocks before credential provider", async () => {
    const { dir, roots, paths } = await makeLivePaths();
    let credentialCalls = 0;
    try {
      await writeFile(paths.approvalPhraseFile, "I approve a different unsafe thing\n", "utf8");
      await expect(run(liveArgs(paths), { roots, credentialProvider: async () => { credentialCalls += 1; return { key: "mock" }; } })).rejects.toThrow("not_run_approval_phrase_contract_mismatch");
      expect(credentialCalls).toBe(0);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("invalid private packet path blocks before credential provider", async () => {
    const { dir, roots, paths } = await makeLivePaths();
    let credentialCalls = 0;
    try {
      const outsidePacket = join(dir, "packet.json");
      await writeFile(outsidePacket, `${JSON.stringify(packet())}\n`, "utf8");
      await expect(run(liveArgs({ ...paths, privatePacket: outsidePacket }), { roots, credentialProvider: async () => { credentialCalls += 1; return { key: "mock" }; } })).rejects.toThrow("private_packet_json_outside_approved_root_rejected");
      expect(credentialCalls).toBe(0);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("invalid final-check receipt path blocks before credential provider", async () => {
    const { dir, roots, paths } = await makeLivePaths();
    let credentialCalls = 0;
    try {
      await expect(run(liveArgs({ ...paths, finalCheck: join(dir, "final-check.json") }), { roots, credentialProvider: async () => { credentialCalls += 1; return { key: "mock" }; } })).rejects.toThrow("final_check_redacted_json_outside_approved_root_rejected");
      expect(credentialCalls).toBe(0);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("invalid private result path blocks before credential provider", async () => {
    const { dir, roots, paths } = await makeLivePaths();
    let credentialCalls = 0;
    try {
      await expect(run(liveArgs({ ...paths, privateResultJson: join(dir, "result.json") }), { roots, credentialProvider: async () => { credentialCalls += 1; return { key: "mock" }; } })).rejects.toThrow("private_result_json_outside_approved_root_rejected");
      expect(credentialCalls).toBe(0);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("invalid redacted receipt path blocks before credential provider", async () => {
    const { dir, roots, paths } = await makeLivePaths();
    let credentialCalls = 0;
    try {
      await expect(run(liveArgs({ ...paths, receiptMd: join(dir, "receipt.md") }), { roots, credentialProvider: async () => { credentialCalls += 1; return { key: "mock" }; } })).rejects.toThrow("redacted_receipt_md_outside_approved_root_rejected");
      expect(credentialCalls).toBe(0);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("output paths inside repo are rejected", async () => {
    const { dir, roots, paths } = await makeLivePaths();
    let credentialCalls = 0;
    try {
      await expect(run(liveArgs({ ...paths, privateResultMd: join(process.cwd(), "tmp-result.md") }), { roots, credentialProvider: async () => { credentialCalls += 1; return { key: "mock" }; } })).rejects.toThrow("private_result_md_inside_repo_rejected");
      expect(credentialCalls).toBe(0);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("missing final-check receipt blocks before credential provider", async () => {
    const { dir, roots, paths } = await makeLivePaths();
    let credentialCalls = 0;
    try {
      await rm(paths.finalCheck, { force: true });
      await expect(run(liveArgs(paths), { roots, credentialProvider: async () => { credentialCalls += 1; return { key: "mock" }; } })).rejects.toThrow();
      expect(credentialCalls).toBe(0);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("missing receipt contract check result blocks before credential provider", async () => {
    const { dir, roots, paths } = await makeLivePaths({}, { receipt_contract_check_result: undefined });
    let credentialCalls = 0;
    try {
      await expect(run(liveArgs(paths), { roots, nowMs: NOW_MS, credentialProvider: async () => { credentialCalls += 1; return { key: "mock" }; } })).rejects.toThrow("blocked_final_check_receipt_contract_check_result_missing");
      expect(credentialCalls).toBe(0);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("missing receipt contract version blocks before credential provider", async () => {
    const { dir, roots, paths } = await makeLivePaths({}, { receipt_contract_version: undefined });
    let credentialCalls = 0;
    try {
      await expect(run(liveArgs(paths), { roots, nowMs: NOW_MS, credentialProvider: async () => { credentialCalls += 1; return { key: "mock" }; } })).rejects.toThrow("blocked_final_check_receipt_contract_version_missing");
      expect(credentialCalls).toBe(0);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("missing receipt contract check blocks before credential provider", async () => {
    const { dir, roots, paths } = await makeLivePaths({}, { receipt_contract_check: undefined });
    let credentialCalls = 0;
    try {
      await expect(run(liveArgs(paths), { roots, nowMs: NOW_MS, credentialProvider: async () => { credentialCalls += 1; return { key: "mock" }; } })).rejects.toThrow("blocked_final_check_receipt_contract_check_missing");
      expect(credentialCalls).toBe(0);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("receipt contract check not passed blocks before credential provider", async () => {
    const { dir, roots, paths } = await makeLivePaths({}, { receipt_contract_check: "not_passed" });
    let credentialCalls = 0;
    try {
      await expect(run(liveArgs(paths), { roots, nowMs: NOW_MS, credentialProvider: async () => { credentialCalls += 1; return { key: "mock" }; } })).rejects.toThrow("blocked_final_check_receipt_contract_check_not_passed");
      expect(credentialCalls).toBe(0);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("missing receipt consistency blocks before credential provider", async () => {
    const { dir, roots, paths } = await makeLivePaths({}, { receipt_consistency_check: undefined });
    let credentialCalls = 0;
    try {
      await expect(run(liveArgs(paths), { roots, nowMs: NOW_MS, credentialProvider: async () => { credentialCalls += 1; return { key: "mock" }; } })).rejects.toThrow("blocked_final_check_receipt_consistency_missing");
      expect(credentialCalls).toBe(0);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("receipt consistency not passed blocks before credential provider", async () => {
    const { dir, roots, paths } = await makeLivePaths({}, { receipt_consistency_check: "not_passed" });
    let credentialCalls = 0;
    try {
      await expect(run(liveArgs(paths), { roots, nowMs: NOW_MS, credentialProvider: async () => { credentialCalls += 1; return { key: "mock" }; } })).rejects.toThrow("blocked_final_check_receipt_consistency_not_passed");
      expect(credentialCalls).toBe(0);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("freshness-unknown final-check receipt blocks before credential provider", async () => {
    const { dir, roots, paths } = await makeLivePaths({}, { checked_at: undefined });
    let credentialCalls = 0;
    try {
      await expect(run(liveArgs(paths), { roots, nowMs: NOW_MS, credentialProvider: async () => { credentialCalls += 1; return { key: "mock" }; } })).rejects.toThrow("blocked_final_check_freshness_timestamp_missing");
      expect(credentialCalls).toBe(0);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("malformed freshness timestamp blocks before credential provider", async () => {
    const { dir, roots, paths } = await makeLivePaths({}, { checked_at: "not-an-iso-timestamp" });
    let credentialCalls = 0;
    try {
      await expect(run(liveArgs(paths), { roots, nowMs: NOW_MS, credentialProvider: async () => { credentialCalls += 1; return { key: "mock" }; } })).rejects.toThrow("blocked_final_check_freshness_timestamp_invalid");
      expect(credentialCalls).toBe(0);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("prior v2-style final-check fixture without consistency and timestamp blocks", async () => {
    const { dir, roots, paths } = await makeLivePaths({}, { receipt_contract_check_result: undefined, receipt_contract_check: undefined, receipt_consistency_check: undefined, checked_at: undefined });
    let credentialCalls = 0;
    try {
      await expect(run(liveArgs(paths), { roots, nowMs: NOW_MS, credentialProvider: async () => { credentialCalls += 1; return { key: "mock" }; } })).rejects.toThrow("blocked_final_check_receipt_contract_check_result_missing");
      expect(credentialCalls).toBe(0);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("prior v3-style final-check fixture missing receipt_contract_check blocks", async () => {
    const { dir, roots, paths } = await makeLivePaths({}, { receipt_contract_check: undefined });
    let credentialCalls = 0;
    try {
      await expect(run(liveArgs(paths), { roots, nowMs: NOW_MS, credentialProvider: async () => { credentialCalls += 1; return { key: "mock" }; } })).rejects.toThrow("blocked_final_check_receipt_contract_check_missing");
      expect(credentialCalls).toBe(0);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("prior v4-style final-check fixture missing receipt_contract_check_result blocks", async () => {
    const { dir, roots, paths } = await makeLivePaths({}, { receipt_contract_check_result: undefined });
    let credentialCalls = 0;
    try {
      await expect(run(liveArgs(paths), { roots, nowMs: NOW_MS, credentialProvider: async () => { credentialCalls += 1; return { key: "mock" }; } })).rejects.toThrow("blocked_final_check_receipt_contract_check_result_missing");
      expect(credentialCalls).toBe(0);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("stale final-check receipt blocks before credential provider", async () => {
    const { dir, roots, paths } = await makeLivePaths({}, { checked_at: OLD_CHECKED_AT });
    let credentialCalls = 0;
    try {
      await expect(run(liveArgs(paths), { roots, nowMs: NOW_MS, credentialProvider: async () => { credentialCalls += 1; return { key: "mock" }; } })).rejects.toThrow("blocked_final_check_stale");
      expect(credentialCalls).toBe(0);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("final-check readiness not ready blocks before credential provider", async () => {
    const { dir, roots, paths } = await makeLivePaths({}, { mutation_readiness_after_final_check: "blocked" });
    let credentialCalls = 0;
    try {
      await expect(run(liveArgs(paths), { roots, nowMs: NOW_MS, credentialProvider: async () => { credentialCalls += 1; return { key: "mock" }; } })).rejects.toThrow("not_run_final_check_failed");
      expect(credentialCalls).toBe(0);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("ready state still requires live_lookup_ran true", async () => {
    const { dir, roots, paths } = await makeLivePaths({}, { live_lookup_ran: false });
    let credentialCalls = 0;
    try {
      await expect(run(liveArgs(paths), { roots, nowMs: NOW_MS, credentialProvider: async () => { credentialCalls += 1; return { key: "mock" }; } })).rejects.toThrow("not_run_final_check_failed");
      expect(credentialCalls).toBe(0);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("ready state still requires mailerlite_api_called true", async () => {
    const { dir, roots, paths } = await makeLivePaths({}, { mailerlite_api_called: false });
    let credentialCalls = 0;
    try {
      await expect(run(liveArgs(paths), { roots, nowMs: NOW_MS, credentialProvider: async () => { credentialCalls += 1; return { key: "mock" }; } })).rejects.toThrow("not_run_final_check_failed");
      expect(credentialCalls).toBe(0);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("ready state still requires completed final-check route status", async () => {
    const { dir, roots, paths } = await makeLivePaths({}, { route_status: "fixture_mock_redaction_safe" });
    let credentialCalls = 0;
    try {
      await expect(run(liveArgs(paths), { roots, nowMs: NOW_MS, credentialProvider: async () => { credentialCalls += 1; return { key: "mock" }; } })).rejects.toThrow("not_run_final_check_failed");
      expect(credentialCalls).toBe(0);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("final-check subscriber_lookup_status found blocks with v1 existing-subscriber blocker", async () => {
    const { dir, roots, paths } = await makeLivePaths({}, { subscriber_lookup_status: "found", subscriber_status_class: "active", onboarding_group_membership_status: "absent" });
    let credentialCalls = 0;
    try {
      await expect(run(liveArgs(paths), { roots, nowMs: NOW_MS, credentialProvider: async () => { credentialCalls += 1; return { key: "mock" }; } })).rejects.toThrow("blocked_existing_subscriber_path_not_supported_by_v1_guard");
      expect(credentialCalls).toBe(0);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("final-check subscriber already in onboarding group blocks", () => {
    const result = validateFinalCheckReceipt(safeFinalCheck({ onboarding_group_membership_status: "present" }), { nowMs: NOW_MS });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("final_check_group_membership_not_safe");
  });

  test("suppression failure blocks", () => {
    const result = validateFinalCheckReceipt(safeFinalCheck({ suppression_status: "blocked" }), { nowMs: NOW_MS });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("final_check_suppression_not_pass");
  });

  test("idempotency failure blocks", () => {
    const result = validateFinalCheckReceipt(safeFinalCheck({ idempotency_status: "blocked" }), { nowMs: NOW_MS });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("final_check_idempotency_not_pass");
  });

  test("missing private email anchor blocks before credential provider", async () => {
    const { dir, roots, paths } = await makeLivePaths({ private_lookup: {} });
    let credentialCalls = 0;
    try {
      await expect(run(liveArgs(paths), { roots, nowMs: NOW_MS, credentialProvider: async () => { credentialCalls += 1; return { key: "mock" }; } })).rejects.toThrow("blocked_missing_private_packet_email_anchor");
      expect(credentialCalls).toBe(0);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("missing private onboarding group reference blocks before credential provider", async () => {
    const { dir, roots, paths } = await makeLivePaths({ confirmed_onboarding_group_reference: "" });
    let credentialCalls = 0;
    try {
      await expect(run(liveArgs(paths), { roots, nowMs: NOW_MS, credentialProvider: async () => { credentialCalls += 1; return { key: "mock" }; } })).rejects.toThrow("blocked_missing_private_packet_group_reference");
      expect(credentialCalls).toBe(0);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("only POST /api/subscribers is called in mocked mutation success", async () => {
    const { requests, dir } = await runMockedLive();
    try {
      expect(requests.map((request) => `${request.method} ${request.path}`)).toEqual(["POST /api/subscribers"]);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("POST /api/subscribers payload includes only email, allowed fields, and confirmed group", async () => {
    const { requests, dir } = await runMockedLive();
    try {
      const payload = requests[0].payload as Record<string, unknown>;
      expect(Object.keys(payload).sort()).toEqual(["email", "fields", "groups"]);
      expect(payload.email).toBe(FAKE_EMAIL);
      expect(payload.fields).toEqual({ name: "Synthetic Person", country: "Synthetic Country", city: "Synthetic City" });
      expect(payload.groups).toEqual([FAKE_CONFIRMED_GROUP_REFERENCE]);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("payload omits source context/private-anchor field families", () => {
    const payload = buildExactMutationPayload(packet());
    const encoded = JSON.stringify(payload);
    expect(encoded).not.toContain("source_channel");
    expect(encoded).not.toContain("source_context");
    expect(encoded).not.toContain("onboarding_started_at");
    expect(encoded).not.toContain("consent_or_context");
    expect(encoded).not.toContain("crm_core_private_anchor_label");
  });

  test("payload does not set status or resubscribe", () => {
    const payload = buildExactMutationPayload(packet());
    expect(payload).not.toHaveProperty("status");
    expect(payload).not.toHaveProperty("resubscribe");
  });

  test("PUT /api/subscribers/{id} is forbidden", () => {
    expect(() => assertAllowedExactMutationRequest({ method: "PUT", path: "/api/subscribers/abc" })).toThrow("blocked_put_subscriber_update_endpoint");
  });

  test("POST /api/subscribers/{id}/groups/{group_id} is forbidden in v1", () => {
    expect(() => assertAllowedExactMutationRequest({ method: "POST", path: "/api/subscribers/sub_fake_secret_000/groups/grp_fake_secret_123" })).toThrow("blocked_existing_subscriber_group_assignment_endpoint_v1");
  });

  test("DELETE subscriber endpoint is forbidden", () => {
    expect(() => assertAllowedExactMutationRequest({ method: "DELETE", path: "/api/subscribers/sub_fake_secret_000" })).toThrow("blocked_subscriber_deletion_endpoint");
  });

  test("forget endpoint is forbidden", () => {
    expect(() => assertAllowedExactMutationRequest({ method: "POST", path: "/api/subscribers/sub_fake_secret_000/forget" })).toThrow("blocked_subscriber_forget_endpoint");
  });

  test("group create/update/delete endpoints are forbidden", () => {
    expect(() => assertAllowedExactMutationRequest({ method: "POST", path: "/api/groups" })).toThrow("blocked_group_create_endpoint");
    expect(() => assertAllowedExactMutationRequest({ method: "PUT", path: "/api/groups/grp_fake_secret_123" })).toThrow("blocked_group_update_endpoint");
    expect(() => assertAllowedExactMutationRequest({ method: "DELETE", path: "/api/groups/grp_fake_secret_123" })).toThrow("blocked_group_delete_endpoint");
  });

  test("GET group subscribers is forbidden inside mutation command", () => {
    expect(() => assertAllowedExactMutationRequest({ method: "GET", path: "/api/groups/grp_fake_secret_123/subscribers" })).toThrow("blocked_group_subscriber_read_in_mutation_command");
  });

  test("group import endpoint is forbidden", () => {
    expect(() => assertAllowedExactMutationRequest({ method: "POST", path: "/api/groups/grp_fake_secret_123/import-subscribers" })).toThrow("blocked_group_import_endpoint");
  });

  test("group unassign endpoint is forbidden", () => {
    expect(() => assertAllowedExactMutationRequest({ method: "DELETE", path: "/api/subscribers/sub_fake_secret_000/groups/grp_fake_secret_123" })).toThrow("blocked_group_unassign_endpoint");
  });

  test("automation endpoints are forbidden", () => {
    expect(() => assertAllowedExactMutationRequest({ method: "POST", path: "/api/automations" })).toThrow("blocked_automation_mutation_endpoint");
  });

  test("campaign endpoints are forbidden", () => {
    expect(() => assertAllowedExactMutationRequest({ method: "POST", path: "/api/campaigns" })).toThrow("blocked_campaign_endpoint");
  });

  test("segment/form/webhook/account settings endpoints are forbidden", () => {
    expect(() => assertAllowedExactMutationRequest({ method: "POST", path: "/api/segments" })).toThrow("blocked_segment_endpoint");
    expect(() => assertAllowedExactMutationRequest({ method: "POST", path: "/api/forms" })).toThrow("blocked_form_endpoint");
    expect(() => assertAllowedExactMutationRequest({ method: "POST", path: "/api/webhooks" })).toThrow("blocked_webhook_endpoint");
    expect(() => assertAllowedExactMutationRequest({ method: "PATCH", path: "/api/account/settings" })).toThrow("blocked_account_settings_endpoint");
  });

  test("broad import endpoint is forbidden", () => {
    expect(() => assertAllowedExactMutationRequest({ method: "POST", path: "/api/subscribers/import" })).toThrow("blocked_broad_import_endpoint");
  });

  test("credential provider is not called before all prechecks pass", async () => {
    const { credentialCalls, dir } = await runMockedLive();
    try {
      expect(credentialCalls).toBe(1);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("network client is not called before all prechecks pass", async () => {
    const { dir, roots, paths } = await makeLivePaths({}, { checked_at: OLD_CHECKED_AT });
    let networkCalls = 0;
    try {
      await expect(run(liveArgs(paths), {
        roots,
        nowMs: NOW_MS,
        credentialProvider: async () => ({ key: "mock" }),
        exactMutationClient: { request: async () => { networkCalls += 1; return { ok: true }; } },
      })).rejects.toThrow("blocked_final_check_stale");
      expect(networkCalls).toBe(0);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("mocked successful mutation writes private result under /tmp in tests", async () => {
    const { paths, dir } = await runMockedLive();
    try {
      expect(paths.privateResultJson).toContain(tmpdir());
      expect(paths.privateResultMd).toContain(tmpdir());
      expectNoSensitiveStrings(await readFile(paths.privateResultJson, "utf8"));
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("mocked successful mutation writes redacted JSON/MD receipts under /tmp in tests", async () => {
    const { paths, dir } = await runMockedLive();
    try {
      expect(paths.receiptJson).toContain(tmpdir());
      expect(paths.receiptMd).toContain(tmpdir());
      expectNoSensitiveStrings(await readFile(paths.receiptJson, "utf8"));
      expectNoSensitiveStrings(await readFile(paths.receiptMd, "utf8"));
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("stdout/stderr do not contain synthetic private values", async () => {
    const dir = await mkdtemp(join(tmpdir(), "crm-core-mailerlite-exact-fixture-"));
    try {
      const fixtureFile = join(dir, "fixture.json");
      const privateResultJson = join(dir, "private-result.json");
      const privateResultMd = join(dir, "private-result.md");
      const receiptJson = join(dir, "receipt.json");
      const receiptMd = join(dir, "receipt.md");
      await writeFile(fixtureFile, `${JSON.stringify({ packet: packet(), finalCheckReceipt: safeFinalCheck({ checked_at: new Date().toISOString() }) }, null, 2)}\n`, "utf8");
      const { stdout, stderr } = await execFileAsync("node", [SCRIPT, "--fixture-file", fixtureFile, "--private-result-json", privateResultJson, "--private-result-md", privateResultMd, "--redacted-receipt-json", receiptJson, "--redacted-receipt-md", receiptMd], { cwd: process.cwd() });
      expectNoSensitiveStrings(`${stdout}\n${stderr}`);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("redacted JSON receipt does not contain synthetic private values", async () => {
    const { paths, dir } = await runMockedLive();
    try { expectNoSensitiveStrings(await readFile(paths.receiptJson, "utf8")); }
    finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("redacted Markdown receipt does not contain synthetic private values", async () => {
    const { paths, dir } = await runMockedLive();
    try { expectNoSensitiveStrings(await readFile(paths.receiptMd, "utf8")); }
    finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("private result test output is under /tmp only", async () => {
    const { paths, dir } = await runMockedLive();
    try {
      expect(paths.privateResultJson).toContain(tmpdir());
      expect(paths.privateResultMd).toContain(tmpdir());
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("tests do not touch real Mantis-Reports", async () => {
    const { paths, dir } = await runMockedLive();
    try {
      expect(paths.receiptJson).not.toContain("/Users/alejandrogomez/Documents/Mantis-Reports");
      expect(paths.receiptMd).not.toContain("/Users/alejandrogomez/Documents/Mantis-Reports");
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("tests do not touch real Mantis-Private-Source-Artifacts", async () => {
    const { paths, dir } = await runMockedLive();
    try {
      expect(paths.privateResultJson).not.toContain("/Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts");
      expect(paths.privateResultMd).not.toContain("/Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts");
    } finally { await rm(dir, { recursive: true, force: true }); }
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
