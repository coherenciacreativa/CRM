import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, rm, symlink, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, test } from "vitest";

import {
  COMPLETED_FINAL_CHECK_ROUTE_STATUS,
  DEFAULT_API_BASE,
  EXACT_MUTATION_GUARD_STATUS,
  EXACT_ONBOARDING_MUTATION_APPROVAL_CONTRACT_VERSION,
  EXACT_ONBOARDING_MUTATION_APPROVAL_PHRASE,
  FUTURE_EXACT_APPROVAL_PHRASE,
  PILOT_ACTIVE_NEXT_ACTION,
  PILOT_APPROVAL_RECEIPT_CONTRACT_VERSION,
  PILOT_DUAL_GROUP_GUARD_STATUS,
  PILOT_DUAL_GROUP_OPERATION_CLASS,
  PILOT_FINAL_CHECK_MAX_AGE_MS,
  PILOT_MAX_MAILERLITE_UPSERTS,
  PILOT_MISSION_CONTRACT_RELATIVE_PATH,
  PILOT_MISSION_CONTRACT_VERSION,
  PILOT_MISSION_ID,
  SAFE_MUTATION_CLIENT_CONTRACT,
  assertAllowedExactMutationRequest,
  buildExactMutationPayload,
  createMailerLiteExactMutationClient,
  executeExactMutation,
  run,
  validateFinalCheckReceipt,
} from "../scripts/crm-vnext-mailerlite-exact-onboarding-mutation.mjs";
import {
  PILOT_APPROVAL_CONTEXT,
  PILOT_APPROVAL_RECEIPT_SCHEMA_VERSION,
  validatePilotApprovalReceipt,
} from "../scripts/crm-vnext-mailerlite-limited-pilot-dual-group-approval-contract.mjs";
import {
  FINAL_CHECK_PRIVATE_PACKET_BINDING_CONTRACT_VERSION,
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
const FAKE_TRIGGER_GROUP_REFERENCE = "grp_fake_active_trigger_234";
const FAKE_CONDITION_GROUP_REFERENCE = "grp_fake_onboarding_condition_345";
const PILOT_PACKET_ID = "crm_core_limited_pilot_packet_fixture_001";
const PILOT_OPERATION_ID = "crm_core_limited_pilot_operation_fixture_001";
const PILOT_EXPECTED_HEAD = "a".repeat(40);
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
  FAKE_TRIGGER_GROUP_REFERENCE,
  FAKE_CONDITION_GROUP_REFERENCE,
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
    privatePilotRoot: join(dir, "Mantis-Private-Source-Artifacts", "instagram", "controlled-welcome-flow", "limited-operational-pilot-2026-07-13"),
  };
  await mkdir(roots.privateMailerLiteRoot, { recursive: true });
  await mkdir(roots.redactedReceiptRoot, { recursive: true });
  await mkdir(roots.privatePilotRoot, { recursive: true });
  return { dir, roots };
};

const writePilotMutexFixture = async (lockDirectory: string, value: Record<string, unknown>) => {
  const mutexPath = join(lockDirectory, "mission_effect_claim.mutex");
  const ownerToken = String(value.owner_token);
  const markerName = `owner-${ownerToken}`;
  await mkdir(mutexPath, { mode: 0o700 });
  await symlink(JSON.stringify({
    ...value,
    schema_version: "crm_core_limited_pilot_effect_claim_mutex_v3",
    marker_name: markerName,
  }), join(mutexPath, markerName));
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

const dualPacket = (overrides: Record<string, unknown> = {}) => ({
  ...packet(),
  packet_id: PILOT_PACKET_ID,
  operation_id: PILOT_OPERATION_ID,
  operation_class: PILOT_DUAL_GROUP_OPERATION_CLASS,
  mission_id: PILOT_MISSION_ID,
  mission_contract_version: PILOT_MISSION_CONTRACT_VERSION,
  pilot_approval_contract_version: PILOT_APPROVAL_RECEIPT_CONTRACT_VERSION,
  mission_created_at: FRESH_CHECKED_AT,
  expected_repo_head: PILOT_EXPECTED_HEAD,
  expected_active_next_action: PILOT_ACTIVE_NEXT_ACTION,
  confirmed_onboarding_group_reference: undefined,
  private_lookup: {
    email: FAKE_EMAIL,
    active_live_trigger_group_reference: FAKE_TRIGGER_GROUP_REFERENCE,
    onboarding_condition_group_reference: FAKE_CONDITION_GROUP_REFERENCE,
  },
  ...overrides,
});

const sha256 = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");

const pilotApprovalReceipt = ({ missionContractSha256, groupEvidenceSha256 }: { missionContractSha256: string; groupEvidenceSha256: string }) => ({
  schema_version: PILOT_APPROVAL_RECEIPT_SCHEMA_VERSION,
  receipt_contract_version: PILOT_APPROVAL_RECEIPT_CONTRACT_VERSION,
  mission_id: PILOT_MISSION_ID,
  mission_contract_version: PILOT_MISSION_CONTRACT_VERSION,
  approval_status: "approved",
  approval_message_exact: "adelante",
  approval_context: PILOT_APPROVAL_CONTEXT,
  immediate_reply_binding: "passed",
  execution_explicitly_approved: true,
  approved_operation_class: PILOT_DUAL_GROUP_OPERATION_CLASS,
  approved_route: "crm_core_direct_mailerlite_api",
  approved_endpoint_signature: "POST /api/subscribers",
  approved_group_reference_count: 2,
  group_references_must_be_distinct: true,
  atomicity: "single_request_single_payload_groups_array",
  proxy_scope: "forbidden_no_further_access_or_changes",
  campaign_scope: "forbidden_not_launched",
  max_mailerlite_upserts: PILOT_MAX_MAILERLITE_UPSERTS,
  mission_contract_sha256: missionContractSha256,
  approved_group_evidence_sha256: groupEvidenceSha256,
});

const safeFinalCheck = (overrides: Record<string, unknown> = {}) => ({
  run_id: "crm_core_mailerlite_final_check_synthetic_binding_test",
  packet_id: "redacted_private_packet",
  packet_binding_status: "private_exact_packet_bound",
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
    pilotApprovalReceipt: join(roots.privatePilotRoot, "mission_approval_receipt_private.json"),
    operationRegistry: join(roots.privatePilotRoot, "operation_registry_private.json"),
    approvedDualGroupEvidence: join(roots.privateMailerLiteRoot, "approved-dual-group-evidence.json"),
    missionContractFile: join(process.cwd(), PILOT_MISSION_CONTRACT_RELATIVE_PATH),
  };
  await writeFile(paths.approvalPhraseFile, `${FUTURE_EXACT_APPROVAL_PHRASE}\n`, "utf8");
  await writeFile(paths.privatePacket, `${JSON.stringify(packet(packetOverrides), null, 2)}\n`, "utf8");
  await writeFile(paths.finalCheck, `${JSON.stringify(safeFinalCheck(finalOverrides), null, 2)}\n`, "utf8");
  return { dir, roots, paths };
};

const prepareDualLivePaths = async (
  packetOverrides: Record<string, unknown> = {},
  finalOverrides: Record<string, unknown> = {},
  registryOverrides: Record<string, unknown> = {},
  approvalOverrides: Record<string, unknown> = {},
) => {
  const prepared = await makeLivePaths();
  const { paths } = prepared;
  const packetValue = dualPacket(packetOverrides);
  const packetText = `${JSON.stringify(packetValue, null, 2)}\n`;
  const evidenceValue = {
    schema_version: "crm-core-fresh-dual-group-single-upsert-private-result-v1",
    final_status: "dual_group_upsert_verified_automation_entry_not_recorded",
    mutation_outcome_known: true,
    mutation_call_count: 1,
    trigger_group_reference_private: FAKE_TRIGGER_GROUP_REFERENCE,
    condition_group_reference_private: FAKE_CONDITION_GROUP_REFERENCE,
  };
  const evidenceText = `${JSON.stringify(evidenceValue, null, 2)}\n`;
  const missionContractBytes = await readFile(paths.missionContractFile);
  const approvalValue = {
    ...pilotApprovalReceipt({
      missionContractSha256: sha256(missionContractBytes),
      groupEvidenceSha256: sha256(evidenceText),
    }),
    ...approvalOverrides,
  };
  const approvalText = `${JSON.stringify(approvalValue, null, 2)}\n`;
  const emailValue = String((packetValue.private_lookup as Record<string, unknown>)?.email ?? "").trim().toLowerCase();
  const identityAnchorSha256 = sha256(emailValue);
  const registryValue = {
    schema_version: "crm_core_limited_operational_pilot_operation_registry_v2",
    mission_id: PILOT_MISSION_ID,
    operations: {
      [String(packetValue.operation_id)]: {
        operation_id: packetValue.operation_id,
        packet_id: packetValue.packet_id,
        operation_class: PILOT_DUAL_GROUP_OPERATION_CLASS,
        expected_group_reference_count: 2,
        state: "prepared",
        prepared_at: FRESH_CHECKED_AT,
        packet_sha256: sha256(packetText),
        identity_anchor_sha256: identityAnchorSha256,
        pilot_approval_receipt_sha256: sha256(approvalText),
        mission_contract_sha256: sha256(missionContractBytes),
        approved_group_evidence_sha256: sha256(evidenceText),
        ...registryOverrides,
      },
    },
    effect_locks: {},
    unknown_effects: [],
  };
  const finalValue = safeFinalCheck(finalOverrides);
  const finalTimestamp = String(finalValue.completed_at ?? finalValue.checked_at);
  const finalCheckPrivateBinding = {
    schema_version: "crm-vnext-mailerlite-final-idempotency-suppression-check-2026-07-06-v0-private-result",
    run_id: finalValue.run_id,
    completed_at: finalTimestamp,
    packet_id: packetValue.packet_id,
    packet_binding_contract_version: FINAL_CHECK_PRIVATE_PACKET_BINDING_CONTRACT_VERSION,
    packet_sha256_private: sha256(packetText),
    operation_id_private: packetValue.operation_id,
    operation_class_private: packetValue.operation_class,
    mode: "live_readonly_packet_specific",
    route_status: finalValue.route_status,
    result: {
      mutation_readiness_after_final_check: finalValue.mutation_readiness_after_final_check,
    },
  };
  await writeFile(paths.privatePacket, packetText, "utf8");
  await writeFile(paths.finalCheck, `${JSON.stringify(finalValue, null, 2)}\n`, "utf8");
  await writeFile(paths.finalCheckPrivateResultJson, `${JSON.stringify(finalCheckPrivateBinding, null, 2)}\n`, "utf8");
  await writeFile(paths.approvedDualGroupEvidence, evidenceText, "utf8");
  await writeFile(paths.pilotApprovalReceipt, approvalText, "utf8");
  await writeFile(paths.operationRegistry, `${JSON.stringify(registryValue, null, 2)}\n`, "utf8");
  return prepared;
};

const refreshDualPilotArtifacts = async (paths: Record<string, string>, refreshedAtMs: number) => {
  const refreshedAt = new Date(refreshedAtMs).toISOString();
  const packetValue = JSON.parse(await readFile(paths.privatePacket, "utf8"));
  packetValue.mission_created_at = refreshedAt;
  const packetText = `${JSON.stringify(packetValue, null, 2)}\n`;

  const registryValue = JSON.parse(await readFile(paths.operationRegistry, "utf8"));
  registryValue.operations[PILOT_OPERATION_ID].prepared_at = refreshedAt;
  registryValue.operations[PILOT_OPERATION_ID].packet_sha256 = sha256(packetText);

  const finalValue = JSON.parse(await readFile(paths.finalCheck, "utf8"));
  finalValue.checked_at = refreshedAt;
  delete finalValue.completed_at;

  const finalPrivateValue = JSON.parse(await readFile(paths.finalCheckPrivateResultJson, "utf8"));
  finalPrivateValue.completed_at = refreshedAt;
  finalPrivateValue.packet_sha256_private = sha256(packetText);

  await writeFile(paths.privatePacket, packetText, "utf8");
  await writeFile(paths.operationRegistry, `${JSON.stringify(registryValue, null, 2)}\n`, "utf8");
  await writeFile(paths.finalCheck, `${JSON.stringify(finalValue, null, 2)}\n`, "utf8");
  await writeFile(paths.finalCheckPrivateResultJson, `${JSON.stringify(finalPrivateValue, null, 2)}\n`, "utf8");
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

const dualLiveArgs = (paths: Record<string, string>) => [
  "--allow-live-exact-onboarding-mutation",
  "--private-packet-json",
  paths.privatePacket,
  "--final-check-redacted-json",
  paths.finalCheck,
  "--final-check-private-result-json",
  paths.finalCheckPrivateResultJson,
  "--private-result-json",
  paths.privateResultJson,
  "--private-result-md",
  paths.privateResultMd,
  "--redacted-receipt-json",
  paths.receiptJson,
  "--redacted-receipt-md",
  paths.receiptMd,
  "--pilot-approval-receipt-json",
  paths.pilotApprovalReceipt,
  "--operation-registry-json",
  paths.operationRegistry,
  "--approved-dual-group-evidence-json",
  paths.approvedDualGroupEvidence,
  "--mission-contract-file",
  paths.missionContractFile,
  "--max-final-check-age-ms",
  "900000",
];

const dualPreflightArgs = (paths: Record<string, string>) => [...dualLiveArgs(paths), "--preflight-only"];

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

const runMockedDualLive = async (
  packetOverrides: Record<string, unknown> = {},
  finalOverrides: Record<string, unknown> = {},
  registryOverrides: Record<string, unknown> = {},
  approvalOverrides: Record<string, unknown> = {},
) => {
  const { dir, roots, paths } = await prepareDualLivePaths(packetOverrides, finalOverrides, registryOverrides, approvalOverrides);
  const requests: Array<Record<string, unknown>> = [];
  let credentialCalls = 0;
  try {
    const receipt = await run(dualLiveArgs(paths), {
      roots,
      nowMs: NOW_MS,
      executionContextProvider: async () => ({
        repo_head: PILOT_EXPECTED_HEAD,
        worktree_clean: true,
        active_next_action: PILOT_ACTIVE_NEXT_ACTION,
      }),
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
      runId: "crm_core_limited_pilot_dual_group_guard_test",
    });
    const receiptJsonText = await readFile(paths.receiptJson, "utf8");
    const receiptMdText = await readFile(paths.receiptMd, "utf8");
    const privateResultText = await readFile(paths.privateResultJson, "utf8");
    expectNoSensitiveStrings(receiptJsonText);
    expectNoSensitiveStrings(receiptMdText);
    expectNoSensitiveStrings(privateResultText);
    return { receipt, requests, credentialCalls, paths, dir, roots };
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

  test("limited-pilot approval receipt validator accepts only the contextual direct dual-group contract", () => {
    const receipt = pilotApprovalReceipt({ missionContractSha256: "a".repeat(64), groupEvidenceSha256: "b".repeat(64) });
    expect(validatePilotApprovalReceipt(receipt).ok).toBe(true);
    expect(validatePilotApprovalReceipt({ ...receipt, approval_message_exact: "Go" }).reason).toBe("blocked_pilot_approval_receipt_approval_message_exact_mismatch");
    expect(validatePilotApprovalReceipt({ ...receipt, proxy_scope: "allowed" }).reason).toBe("blocked_pilot_approval_receipt_proxy_scope_mismatch");
    expect(validatePilotApprovalReceipt({ ...receipt, max_mailerlite_upserts: 6 }).reason).toBe("blocked_pilot_approval_upsert_cap_mismatch");
  });

  test("legacy operation class remains one-group and dual pilot class is exactly two-group", () => {
    expect(buildExactMutationPayload(packet()).groups).toEqual([FAKE_CONFIRMED_GROUP_REFERENCE]);
    expect(buildExactMutationPayload(dualPacket()).groups).toEqual([
      FAKE_TRIGGER_GROUP_REFERENCE,
      FAKE_CONDITION_GROUP_REFERENCE,
    ]);
  });

  test("dual pilot packet blocks missing or duplicate group roles", () => {
    expect(() => buildExactMutationPayload(dualPacket({
      private_lookup: { email: FAKE_EMAIL, onboarding_condition_group_reference: FAKE_CONDITION_GROUP_REFERENCE },
    }))).toThrow("blocked_missing_private_packet_active_trigger_group_reference");
    expect(() => buildExactMutationPayload(dualPacket({
      private_lookup: { email: FAKE_EMAIL, active_live_trigger_group_reference: FAKE_TRIGGER_GROUP_REFERENCE },
    }))).toThrow("blocked_missing_private_packet_onboarding_condition_group_reference");
    expect(() => buildExactMutationPayload(dualPacket({
      private_lookup: {
        email: FAKE_EMAIL,
        active_live_trigger_group_reference: FAKE_TRIGGER_GROUP_REFERENCE,
        onboarding_condition_group_reference: FAKE_TRIGGER_GROUP_REFERENCE,
      },
    }))).toThrow("blocked_private_packet_dual_group_references_not_distinct");
  });

  test("dual pilot mocked live succeeds with one direct POST and redacted group count two", async () => {
    const { receipt, requests, credentialCalls, dir } = await runMockedDualLive();
    try {
      expect(PILOT_DUAL_GROUP_GUARD_STATUS).toBe("limited_pilot_dual_group_direct_api_guard_implemented_mock_tested");
      expect(receipt.operation_class).toBe(PILOT_DUAL_GROUP_OPERATION_CLASS);
      expect(receipt.group_count).toBe(2);
      expect(credentialCalls).toBe(1);
      expect(requests.map((request) => `${request.method} ${request.path}`)).toEqual(["POST /api/subscribers"]);
      const payload = requests[0].payload as Record<string, unknown>;
      expect(Object.keys(payload).sort()).toEqual(["email", "fields", "groups"]);
      expect(payload.groups).toEqual([FAKE_TRIGGER_GROUP_REFERENCE, FAKE_CONDITION_GROUP_REFERENCE]);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("redacted mutation receipts never expose a candidate-derived packet id", async () => {
    const privatePacketId = "private_candidate_handle_123456";
    const { receipt, paths, dir } = await runMockedDualLive({ packet_id: privatePacketId });
    try {
      const redactedJson = await readFile(paths.receiptJson, "utf8");
      const redactedMarkdown = await readFile(paths.receiptMd, "utf8");
      expect(receipt.packet_id).toBe("redacted_private_packet");
      expect(receipt.packet_binding_status).toBe("private_exact_packet_bound");
      expect(redactedJson).not.toContain(privatePacketId);
      expect(redactedMarkdown).not.toContain(privatePacketId);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("legacy exact phrase cannot authorize dual pilot operation", async () => {
    const { dir, roots, paths } = await prepareDualLivePaths();
    let credentialCalls = 0;
    try {
      const args = [...dualLiveArgs(paths), "--approval-phrase-file", paths.approvalPhraseFile];
      await expect(run(args, {
        roots,
        nowMs: NOW_MS,
        executionContextProvider: async () => ({ repo_head: PILOT_EXPECTED_HEAD, worktree_clean: true, active_next_action: PILOT_ACTIVE_NEXT_ACTION }),
        credentialProvider: async () => { credentialCalls += 1; return { key: "mock" }; },
      })).rejects.toThrow("blocked_legacy_approval_phrase_cannot_authorize_dual_group_pilot");
      expect(credentialCalls).toBe(0);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("dual pilot binds packet digest, final-check packet id, and fresh prepared registry before credentials", async () => {
    for (const scenario of [
      { registry: { packet_sha256: "0".repeat(64) }, final: {}, reason: "blocked_pilot_packet_digest_mismatch" },
      { registry: { state: "attempting" }, final: {}, reason: "blocked_pilot_operation_already_attempted_or_unknown" },
      { registry: { prepared_at: "2026-07-07T12:00:30.000Z" }, final: {}, reason: "blocked_pilot_registry_pre_final_check_order_or_freshness_invalid" },
      { registry: {}, final: { packet_binding_status: "private_packet_unavailable" }, reason: "blocked_pilot_final_check_public_binding_status_mismatch" },
    ]) {
      const { dir, roots, paths } = await prepareDualLivePaths({}, scenario.final, scenario.registry);
      let credentialCalls = 0;
      try {
        await expect(run(dualLiveArgs(paths), {
          roots,
          nowMs: NOW_MS,
          executionContextProvider: async () => ({ repo_head: PILOT_EXPECTED_HEAD, worktree_clean: true, active_next_action: PILOT_ACTIVE_NEXT_ACTION }),
          credentialProvider: async () => { credentialCalls += 1; return { key: "mock" }; },
        })).rejects.toThrow(scenario.reason);
        expect(credentialCalls).toBe(0);
      } finally { await rm(dir, { recursive: true, force: true }); }
    }
  });

  test("dual pilot requires the private final-check binding to exact packet bytes and operation", async () => {
    for (const scenario of [
      { key: "packet_sha256_private", value: "0".repeat(64), reason: "blocked_pilot_final_check_private_packet_digest_mismatch" },
      { key: "operation_id_private", value: "different_operation_fixture_999", reason: "blocked_pilot_final_check_private_operation_id_mismatch" },
      { key: "run_id", value: "different_final_check_run_fixture", reason: "blocked_pilot_final_check_private_receipt_run_binding_mismatch" },
    ]) {
      const { dir, roots, paths } = await prepareDualLivePaths();
      let credentialCalls = 0;
      try {
        const privateBinding = JSON.parse(await readFile(paths.finalCheckPrivateResultJson, "utf8"));
        privateBinding[scenario.key] = scenario.value;
        await writeFile(paths.finalCheckPrivateResultJson, `${JSON.stringify(privateBinding, null, 2)}\n`, "utf8");
        await expect(run(dualLiveArgs(paths), {
          roots,
          nowMs: NOW_MS,
          executionContextProvider: async () => ({ repo_head: PILOT_EXPECTED_HEAD, worktree_clean: true, active_next_action: PILOT_ACTIVE_NEXT_ACTION }),
          credentialProvider: async () => { credentialCalls += 1; return { key: "mock" }; },
        })).rejects.toThrow(scenario.reason);
        expect(credentialCalls).toBe(0);
      } finally { await rm(dir, { recursive: true, force: true }); }
    }
  });

  test("dual pilot blocks the same exact-email identity across operation ids before credentials", async () => {
    const { dir, roots, paths } = await prepareDualLivePaths();
    let credentialCalls = 0;
    try {
      const registry = JSON.parse(await readFile(paths.operationRegistry, "utf8"));
      registry.operations.crm_core_limited_pilot_operation_fixture_002 = {
        operation_id: "crm_core_limited_pilot_operation_fixture_002",
        identity_anchor_sha256: registry.operations[PILOT_OPERATION_ID].identity_anchor_sha256,
        state: "prepared",
      };
      await writeFile(paths.operationRegistry, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
      await expect(run(dualLiveArgs(paths), {
        roots,
        nowMs: NOW_MS,
        executionContextProvider: async () => ({ repo_head: PILOT_EXPECTED_HEAD, worktree_clean: true, active_next_action: PILOT_ACTIVE_NEXT_ACTION }),
        credentialProvider: async () => { credentialCalls += 1; return { key: "mock" }; },
      })).rejects.toThrow("blocked_pilot_identity_already_registered_no_retrigger");
      expect(credentialCalls).toBe(0);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("dual pilot enforces five-minute packet binding freshness", async () => {
    const stalePacketAt = new Date(NOW_MS - PILOT_FINAL_CHECK_MAX_AGE_MS - 1).toISOString();
    const { dir, roots, paths } = await prepareDualLivePaths({ mission_created_at: stalePacketAt });
    let credentialCalls = 0;
    try {
      await expect(run(dualLiveArgs(paths), {
        roots,
        nowMs: NOW_MS,
        executionContextProvider: async () => ({ repo_head: PILOT_EXPECTED_HEAD, worktree_clean: true, active_next_action: PILOT_ACTIVE_NEXT_ACTION }),
        credentialProvider: async () => { credentialCalls += 1; return { key: "mock" }; },
      })).rejects.toThrow("blocked_pilot_packet_binding_stale_or_invalid");
      expect(credentialCalls).toBe(0);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("dual pilot enforces five-minute final-check freshness even when CLI asks for fifteen", async () => {
    const staleForPilot = new Date(NOW_MS - PILOT_FINAL_CHECK_MAX_AGE_MS - 1).toISOString();
    const { dir, roots, paths } = await prepareDualLivePaths({}, { checked_at: staleForPilot });
    let credentialCalls = 0;
    try {
      await expect(run(dualLiveArgs(paths), {
        roots,
        nowMs: NOW_MS,
        executionContextProvider: async () => ({ repo_head: PILOT_EXPECTED_HEAD, worktree_clean: true, active_next_action: PILOT_ACTIVE_NEXT_ACTION }),
        credentialProvider: async () => { credentialCalls += 1; return { key: "mock" }; },
      })).rejects.toThrow("blocked_final_check_stale");
      expect(credentialCalls).toBe(0);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("dual pilot blocks alternate API base and mismatched proven group references before credentials", async () => {
    const alternate = await prepareDualLivePaths();
    let alternateCredentialCalls = 0;
    try {
      await expect(run([...dualLiveArgs(alternate.paths), "--api-base", "https://connect.mailerlite.test/api"], {
        roots: alternate.roots,
        nowMs: NOW_MS,
        executionContextProvider: async () => ({ repo_head: PILOT_EXPECTED_HEAD, worktree_clean: true, active_next_action: PILOT_ACTIVE_NEXT_ACTION }),
        credentialProvider: async () => { alternateCredentialCalls += 1; return { key: "mock" }; },
      })).rejects.toThrow("blocked_pilot_noncanonical_mailerlite_api_base");
      expect(DEFAULT_API_BASE).toBe("https://connect.mailerlite.com/api");
      expect(alternateCredentialCalls).toBe(0);
    } finally { await rm(alternate.dir, { recursive: true, force: true }); }

    const mismatched = await prepareDualLivePaths({
      private_lookup: {
        email: FAKE_EMAIL,
        active_live_trigger_group_reference: FAKE_TRIGGER_GROUP_REFERENCE,
        onboarding_condition_group_reference: "grp_fake_unapproved_condition_999",
      },
    });
    let mismatchedCredentialCalls = 0;
    try {
      await expect(run(dualLiveArgs(mismatched.paths), {
        roots: mismatched.roots,
        nowMs: NOW_MS,
        executionContextProvider: async () => ({ repo_head: PILOT_EXPECTED_HEAD, worktree_clean: true, active_next_action: PILOT_ACTIVE_NEXT_ACTION }),
        credentialProvider: async () => { mismatchedCredentialCalls += 1; return { key: "mock" }; },
      })).rejects.toThrow("blocked_pilot_packet_group_references_not_approved");
      expect(mismatchedCredentialCalls).toBe(0);
    } finally { await rm(mismatched.dir, { recursive: true, force: true }); }
  });

  test("dual pilot preflight performs zero credential, network, or effect-lock action", async () => {
    const { dir, roots, paths } = await prepareDualLivePaths();
    let credentialCalls = 0;
    let networkCalls = 0;
    try {
      const receipt = await run(dualPreflightArgs(paths), {
        roots,
        nowMs: NOW_MS,
        executionContextProvider: async () => ({ repo_head: PILOT_EXPECTED_HEAD, worktree_clean: true, active_next_action: PILOT_ACTIVE_NEXT_ACTION }),
        credentialProvider: async () => { credentialCalls += 1; return { key: "mock" }; },
        exactMutationClient: { request: async () => { networkCalls += 1; return { ok: true }; } },
      });
      expect(receipt.group_count).toBe(2);
      expect(receipt.mutation_executed).toBe(false);
      expect(credentialCalls).toBe(0);
      expect(networkCalls).toBe(0);
      await expect(readFile(join(roots.privatePilotRoot, "locks", `${PILOT_OPERATION_ID}.json`))).rejects.toThrow();
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("dual pilot revalidates context after credential resolution immediately before effect", async () => {
    const { dir, roots, paths } = await prepareDualLivePaths();
    let contextCalls = 0;
    let credentialCalls = 0;
    let networkCalls = 0;
    try {
      await expect(run(dualLiveArgs(paths), {
        roots,
        nowMs: NOW_MS,
        executionContextProvider: async () => {
          contextCalls += 1;
          return {
            repo_head: PILOT_EXPECTED_HEAD,
            worktree_clean: contextCalls === 1,
            active_next_action: PILOT_ACTIVE_NEXT_ACTION,
          };
        },
        credentialProvider: async () => { credentialCalls += 1; return { key: "mock" }; },
        exactMutationClient: { request: async () => { networkCalls += 1; return { ok: true }; } },
      })).rejects.toThrow("blocked_pilot_dirty_worktree");
      expect(contextCalls).toBe(2);
      expect(credentialCalls).toBe(1);
      expect(networkCalls).toBe(0);
      await expect(readFile(join(roots.privatePilotRoot, "locks", `${PILOT_OPERATION_ID}.json`))).rejects.toThrow();
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("dual pilot rereads exact packet bytes after credential resolution", async () => {
    const { dir, roots, paths } = await prepareDualLivePaths();
    let credentialCalls = 0;
    let networkCalls = 0;
    try {
      await expect(run(dualLiveArgs(paths), {
        roots,
        nowMs: NOW_MS,
        executionContextProvider: async () => ({ repo_head: PILOT_EXPECTED_HEAD, worktree_clean: true, active_next_action: PILOT_ACTIVE_NEXT_ACTION }),
        credentialProvider: async () => {
          credentialCalls += 1;
          const changedPacket = JSON.parse(await readFile(paths.privatePacket, "utf8"));
          changedPacket.fields.name = "Changed after initial authorization";
          await writeFile(paths.privatePacket, `${JSON.stringify(changedPacket, null, 2)}\n`, "utf8");
          return { key: "mock" };
        },
        exactMutationClient: { request: async () => { networkCalls += 1; return { ok: true }; } },
      })).rejects.toThrow("blocked_pilot_packet_digest_mismatch");
      expect(credentialCalls).toBe(1);
      expect(networkCalls).toBe(0);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("dual pilot atomically enforces the mission-wide five-upsert claim cap", async () => {
    const { dir, roots, paths } = await prepareDualLivePaths();
    let credentialCalls = 0;
    let networkCalls = 0;
    try {
      const lockDirectory = join(roots.privatePilotRoot, "locks");
      await mkdir(lockDirectory, { recursive: true });
      for (let index = 0; index < PILOT_MAX_MAILERLITE_UPSERTS; index += 1) {
        const priorLock = {
          schema_version: "crm_core_limited_pilot_effect_lock_v1",
          mission_id: PILOT_MISSION_ID,
          operation_id: `prior_operation_fixture_${index}`,
          identity_anchor_sha256: sha256(`prior-person-${index}@example.test`),
          state: "completed_known_success",
          retry_allowed: false,
          effect_attempted: true,
        };
        await writeFile(join(lockDirectory, `prior-operation-${index}.json`), `${JSON.stringify(priorLock, null, 2)}\n`, "utf8");
      }
      await expect(run(dualLiveArgs(paths), {
        roots,
        nowMs: NOW_MS,
        executionContextProvider: async () => ({ repo_head: PILOT_EXPECTED_HEAD, worktree_clean: true, active_next_action: PILOT_ACTIVE_NEXT_ACTION }),
        credentialProvider: async () => { credentialCalls += 1; return { key: "mock" }; },
        exactMutationClient: { request: async () => { networkCalls += 1; return { ok: true }; } },
      })).rejects.toThrow("blocked_pilot_global_mailerlite_upsert_cap_reached");
      expect(credentialCalls).toBe(1);
      expect(networkCalls).toBe(0);
      await expect(readFile(join(lockDirectory, `${PILOT_OPERATION_ID}.json`))).rejects.toThrow();
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("dual pilot automatically recovers a claim mutex owned by a dead process", async () => {
    const { dir, roots, paths } = await prepareDualLivePaths();
    try {
      const lockDirectory = join(roots.privatePilotRoot, "locks");
      await mkdir(lockDirectory, { recursive: true });
      await writePilotMutexFixture(lockDirectory, {
        mission_id: PILOT_MISSION_ID,
        operation_id: "abandoned_operation_fixture_123",
        owner_pid: 999999,
        owner_token: "dead-process-owner-token-fixture",
        created_at: FRESH_CHECKED_AT,
        expires_at_ms: Date.now() - 1,
      });
      const requests: Array<Record<string, unknown>> = [];
      const receipt = await run(dualLiveArgs(paths), {
        roots,
        nowMs: NOW_MS,
        executionContextProvider: async () => ({ repo_head: PILOT_EXPECTED_HEAD, worktree_clean: true, active_next_action: PILOT_ACTIVE_NEXT_ACTION }),
        credentialProvider: async () => ({ key: "mock" }),
        exactMutationClient: { request: async (request: Record<string, unknown>) => { requests.push(request); return { ok: true }; } },
      });
      expect(receipt.mutation_executed).toBe(true);
      expect(requests).toHaveLength(1);
      const lock = JSON.parse(await readFile(join(lockDirectory, `${PILOT_OPERATION_ID}.json`), "utf8"));
      expect(lock.state).toBe("completed_known_success");
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("dual pilot never reaps an expired claim mutex while its owner process is still alive", async () => {
    const { dir, roots, paths } = await prepareDualLivePaths();
    try {
      const lockDirectory = join(roots.privatePilotRoot, "locks");
      await mkdir(lockDirectory, { recursive: true });
      await writePilotMutexFixture(lockDirectory, {
        mission_id: PILOT_MISSION_ID,
        operation_id: "expired_operation_fixture_123",
        owner_pid: process.pid,
        owner_token: "expired-owner-token-fixture",
        created_at: FRESH_CHECKED_AT,
        expires_at_ms: Date.now() - 1,
      });
      let networkCalls = 0;
      await expect(run(dualLiveArgs(paths), {
        roots,
        nowMs: NOW_MS,
        executionContextProvider: async () => ({ repo_head: PILOT_EXPECTED_HEAD, worktree_clean: true, active_next_action: PILOT_ACTIVE_NEXT_ACTION }),
        credentialProvider: async () => ({ key: "mock" }),
        exactMutationClient: { request: async () => { networkCalls += 1; return { ok: true }; } },
      })).rejects.toThrow("blocked_pilot_effect_claim_in_progress");
      expect(networkCalls).toBe(0);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("dual pilot recovers an abandoned empty mutex initialization directory after its grace window", async () => {
    const { dir, roots, paths } = await prepareDualLivePaths();
    try {
      const lockDirectory = join(roots.privatePilotRoot, "locks");
      const mutexPath = join(lockDirectory, "mission_effect_claim.mutex");
      await mkdir(mutexPath, { recursive: true });
      const oldTimestamp = new Date(0);
      await utimes(mutexPath, oldTimestamp, oldTimestamp);
      let networkCalls = 0;
      const receipt = await run(dualLiveArgs(paths), {
        roots,
        nowMs: NOW_MS,
        executionContextProvider: async () => ({ repo_head: PILOT_EXPECTED_HEAD, worktree_clean: true, active_next_action: PILOT_ACTIVE_NEXT_ACTION }),
        credentialProvider: async () => ({ key: "mock" }),
        exactMutationClient: { request: async () => { networkCalls += 1; return { ok: true }; } },
      });
      expect(receipt.mutation_executed).toBe(true);
      expect(networkCalls).toBe(1);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("concurrent dead-mutex recovery contenders still permit at most one network attempt", async () => {
    const { dir, roots, paths } = await prepareDualLivePaths();
    try {
      const lockDirectory = join(roots.privatePilotRoot, "locks");
      await mkdir(lockDirectory, { recursive: true });
      await writePilotMutexFixture(lockDirectory, {
        mission_id: PILOT_MISSION_ID,
        operation_id: "dead_race_operation_fixture_123",
        owner_pid: 999999,
        owner_token: "dead-race-owner-token-fixture",
        created_at: FRESH_CHECKED_AT,
        expires_at_ms: Date.now() - 1,
      });
      let networkCalls = 0;
      const deps = {
        roots,
        nowMs: NOW_MS,
        executionContextProvider: async () => ({ repo_head: PILOT_EXPECTED_HEAD, worktree_clean: true, active_next_action: PILOT_ACTIVE_NEXT_ACTION }),
        credentialProvider: async () => ({ key: "mock" }),
        exactMutationClient: { request: async () => { networkCalls += 1; return { ok: true }; } },
      };
      const results = await Promise.allSettled([
        run(dualLiveArgs(paths), deps),
        run(dualLiveArgs(paths), deps),
        run(dualLiveArgs(paths), deps),
        run(dualLiveArgs(paths), deps),
        run(dualLiveArgs(paths), deps),
        run(dualLiveArgs(paths), deps),
      ]);
      const fulfilled = results.filter((result) => result.status === "fulfilled");
      expect(fulfilled).toHaveLength(1);
      expect(networkCalls).toBe(1);
      const lock = JSON.parse(await readFile(join(lockDirectory, `${PILOT_OPERATION_ID}.json`), "utf8"));
      expect(lock.state).toBe("completed_known_success");
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("dual pilot ignores an abandoned partial pending lock and creates a complete atomic effect lock", async () => {
    const { dir, roots, paths } = await prepareDualLivePaths();
    try {
      const lockDirectory = join(roots.privatePilotRoot, "locks");
      await mkdir(lockDirectory, { recursive: true });
      await writeFile(join(lockDirectory, ".effect-lock-crashed-writer.pending"), "{partial", "utf8");
      const receipt = await run(dualLiveArgs(paths), {
        roots,
        nowMs: NOW_MS,
        executionContextProvider: async () => ({ repo_head: PILOT_EXPECTED_HEAD, worktree_clean: true, active_next_action: PILOT_ACTIVE_NEXT_ACTION }),
        credentialProvider: async () => ({ key: "mock" }),
        exactMutationClient: { request: async () => ({ ok: true }) },
      });
      expect(receipt.mutation_executed).toBe(true);
      const lock = JSON.parse(await readFile(join(lockDirectory, `${PILOT_OPERATION_ID}.json`), "utf8"));
      expect(lock.state).toBe("completed_known_success");
      expect(lock.retry_allowed).toBe(false);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("dual pilot rechecks five-minute freshness after claiming and immediately before request", async () => {
    const { dir, roots, paths } = await prepareDualLivePaths();
    let nowCall = 0;
    let networkCalls = 0;
    const times = [NOW_MS, NOW_MS, NOW_MS, NOW_MS + PILOT_FINAL_CHECK_MAX_AGE_MS + 1];
    try {
      await expect(run(dualLiveArgs(paths), {
        roots,
        nowMsProvider: () => times[Math.min(nowCall++, times.length - 1)],
        executionContextProvider: async () => ({ repo_head: PILOT_EXPECTED_HEAD, worktree_clean: true, active_next_action: PILOT_ACTIVE_NEXT_ACTION }),
        credentialProvider: async () => ({ key: "mock" }),
        exactMutationClient: { request: async () => { networkCalls += 1; return { ok: true }; } },
      })).rejects.toThrow("blocked_pilot_binding_expired_before_effect");
      expect(nowCall).toBeGreaterThanOrEqual(4);
      expect(networkCalls).toBe(0);
      const lock = JSON.parse(await readFile(join(roots.privatePilotRoot, "locks", `${PILOT_OPERATION_ID}.json`), "utf8"));
      expect(lock.state).toBe("cancelled_pre_effect_no_network");
      expect(lock.retry_allowed).toBe(true);
      expect(lock.effect_attempted).toBe(false);

      const refreshedAtMs = NOW_MS + PILOT_FINAL_CHECK_MAX_AGE_MS + 60_000;
      await refreshDualPilotArtifacts(paths, refreshedAtMs);
      const retryReceipt = await run(dualLiveArgs(paths), {
        roots,
        nowMs: refreshedAtMs,
        executionContextProvider: async () => ({ repo_head: PILOT_EXPECTED_HEAD, worktree_clean: true, active_next_action: PILOT_ACTIVE_NEXT_ACTION }),
        credentialProvider: async () => ({ key: "mock" }),
        exactMutationClient: { request: async () => { networkCalls += 1; return { ok: true }; } },
      });
      expect(retryReceipt.mutation_executed).toBe(true);
      expect(networkCalls).toBe(1);
      const completedLock = JSON.parse(await readFile(join(roots.privatePilotRoot, "locks", `${PILOT_OPERATION_ID}.json`), "utf8"));
      expect(completedLock.state).toBe("completed_known_success");
      const archivedReservations = await readdir(join(roots.privatePilotRoot, "locks", "cancelled"));
      expect(archivedReservations).toHaveLength(1);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("a live expired owner remains fenced until it cancels, then the same operation can retry", async () => {
    const { dir, roots, paths } = await prepareDualLivePaths();
    let releaseFirstPromotion: (() => void) | null = null;
    let firstClaimPublished: (() => void) | null = null;
    const firstClaimReady = new Promise<void>((resolve) => { firstClaimPublished = resolve; });
    const holdFirstPromotion = new Promise<void>((resolve) => { releaseFirstPromotion = resolve; });
    let networkCalls = 0;
    try {
      const baseDeps = {
        roots,
        nowMs: NOW_MS,
        executionContextProvider: async () => ({ repo_head: PILOT_EXPECTED_HEAD, worktree_clean: true, active_next_action: PILOT_ACTIVE_NEXT_ACTION }),
        credentialProvider: async () => ({ key: "mock" }),
        exactMutationClient: { request: async () => { networkCalls += 1; return { ok: true }; } },
      };
      const firstRun = run(dualLiveArgs(paths), {
        ...baseDeps,
        beforePilotPromotion: async () => {
          firstClaimPublished?.();
          await holdFirstPromotion;
        },
      });
      await firstClaimReady;
      const lockPath = join(roots.privatePilotRoot, "locks", `${PILOT_OPERATION_ID}.json`);
      const expiredClaim = JSON.parse(await readFile(lockPath, "utf8"));
      expiredClaim.pre_effect_lease_expires_at_ms = Date.now() - 1;
      await writeFile(lockPath, `${JSON.stringify(expiredClaim, null, 2)}\n`, "utf8");

      await expect(run(dualLiveArgs(paths), baseDeps)).rejects.toThrow("blocked_pilot_operation_already_claimed_no_retry");
      expect(networkCalls).toBe(0);
      releaseFirstPromotion?.();
      await expect(firstRun).rejects.toThrow("blocked_pilot_pre_effect_claim_not_promotable");
      const retryReceipt = await run(dualLiveArgs(paths), baseDeps);
      expect(retryReceipt.mutation_executed).toBe(true);
      expect(networkCalls).toBe(1);
      const completedLock = JSON.parse(await readFile(lockPath, "utf8"));
      expect(completedLock.state).toBe("completed_known_success");
    } finally {
      releaseFirstPromotion?.();
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("cancelled pre-effect claims with proven zero network do not consume the five-upsert cap", async () => {
    const { dir, roots, paths } = await prepareDualLivePaths();
    try {
      const lockDirectory = join(roots.privatePilotRoot, "locks");
      await mkdir(lockDirectory, { recursive: true });
      for (let index = 0; index < PILOT_MAX_MAILERLITE_UPSERTS; index += 1) {
        await writeFile(join(lockDirectory, `cancelled-prior-${index}.json`), `${JSON.stringify({
          schema_version: "crm_core_limited_pilot_effect_lock_v1",
          mission_id: PILOT_MISSION_ID,
          operation_id: `cancelled_prior_operation_${index}`,
          identity_anchor_sha256: sha256(`cancelled-prior-${index}@example.test`),
          state: "cancelled_pre_effect_no_network",
          retry_allowed: true,
          effect_attempted: false,
          pre_effect_claim_token: `cancelled-claim-token-${index}`,
          cancellation_reason: "synthetic_zero_network_fixture",
          cancelled_at: FRESH_CHECKED_AT,
        }, null, 2)}\n`, "utf8");
      }
      let networkCalls = 0;
      const receipt = await run(dualLiveArgs(paths), {
        roots,
        nowMs: NOW_MS,
        executionContextProvider: async () => ({ repo_head: PILOT_EXPECTED_HEAD, worktree_clean: true, active_next_action: PILOT_ACTIVE_NEXT_ACTION }),
        credentialProvider: async () => ({ key: "mock" }),
        exactMutationClient: { request: async () => { networkCalls += 1; return { ok: true }; } },
      });
      expect(receipt.mutation_executed).toBe(true);
      expect(networkCalls).toBe(1);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("expired pre-effect reservations with live owners remain fail-closed against the mission cap", async () => {
    const { dir, roots, paths } = await prepareDualLivePaths();
    try {
      const lockDirectory = join(roots.privatePilotRoot, "locks");
      await mkdir(lockDirectory, { recursive: true });
      for (let index = 0; index < PILOT_MAX_MAILERLITE_UPSERTS; index += 1) {
        await writeFile(join(lockDirectory, `expired-pre-effect-${index}.json`), `${JSON.stringify({
          schema_version: "crm_core_limited_pilot_effect_lock_v1",
          mission_id: PILOT_MISSION_ID,
          operation_id: `expired_pre_effect_operation_${index}`,
          identity_anchor_sha256: sha256(`expired-pre-effect-${index}@example.test`),
          state: "pre_effect_claimed",
          retry_allowed: true,
          effect_attempted: false,
          pre_effect_claim_token: `expired-claim-token-${index}`,
          pre_effect_owner_pid: process.pid,
          pre_effect_lease_expires_at_ms: Date.now() - 1,
        }, null, 2)}\n`, "utf8");
      }
      let networkCalls = 0;
      await expect(run(dualLiveArgs(paths), {
        roots,
        nowMs: NOW_MS,
        executionContextProvider: async () => ({ repo_head: PILOT_EXPECTED_HEAD, worktree_clean: true, active_next_action: PILOT_ACTIVE_NEXT_ACTION }),
        credentialProvider: async () => ({ key: "mock" }),
        exactMutationClient: { request: async () => { networkCalls += 1; return { ok: true }; } },
      })).rejects.toThrow("blocked_pilot_global_mailerlite_upsert_cap_reached");
      expect(networkCalls).toBe(0);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("same operation safely reclaims a dead-owner exact-bound pre-effect reservation under the mission mutex", async () => {
    const { dir, roots, paths } = await prepareDualLivePaths();
    try {
      const lockDirectory = join(roots.privatePilotRoot, "locks");
      await mkdir(lockDirectory, { recursive: true });
      const packetValue = JSON.parse(await readFile(paths.privatePacket, "utf8"));
      const registryValue = JSON.parse(await readFile(paths.operationRegistry, "utf8"));
      const registryEntry = registryValue.operations[PILOT_OPERATION_ID];
      const finalCheckPrivateBytes = await readFile(paths.finalCheckPrivateResultJson);
      await writeFile(join(lockDirectory, `${PILOT_OPERATION_ID}.json`), `${JSON.stringify({
        schema_version: "crm_core_limited_pilot_effect_lock_v1",
        mission_id: PILOT_MISSION_ID,
        operation_id: PILOT_OPERATION_ID,
        packet_id: packetValue.packet_id,
        packet_sha256: registryEntry.packet_sha256,
        final_check_private_binding_sha256: sha256(finalCheckPrivateBytes),
        identity_anchor_sha256: registryEntry.identity_anchor_sha256,
        state: "pre_effect_claimed",
        retry_allowed: true,
        effect_attempted: false,
        pre_effect_claim_token: "expired-exact-bound-claim-token",
        pre_effect_owner_pid: 999999,
        pre_effect_lease_expires_at_ms: Date.now() - 1,
        claimed_at: FRESH_CHECKED_AT,
      }, null, 2)}\n`, "utf8");

      let networkCalls = 0;
      const receipt = await run(dualLiveArgs(paths), {
        roots,
        nowMs: NOW_MS,
        executionContextProvider: async () => ({ repo_head: PILOT_EXPECTED_HEAD, worktree_clean: true, active_next_action: PILOT_ACTIVE_NEXT_ACTION }),
        credentialProvider: async () => ({ key: "mock" }),
        exactMutationClient: { request: async () => { networkCalls += 1; return { ok: true }; } },
      });
      expect(receipt.mutation_executed).toBe(true);
      expect(networkCalls).toBe(1);
      const completedLock = JSON.parse(await readFile(join(lockDirectory, `${PILOT_OPERATION_ID}.json`), "utf8"));
      expect(completedLock.state).toBe("completed_known_success");
      const archivedReservations = await readdir(join(lockDirectory, "cancelled"));
      expect(archivedReservations).toHaveLength(1);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("dual pilot network failure leaves a no-retry effect lock and never calls mutation twice", async () => {
    const { dir, roots, paths } = await prepareDualLivePaths();
    let credentialCalls = 0;
    let networkCalls = 0;
    const deps = {
      roots,
      nowMs: NOW_MS,
      executionContextProvider: async () => ({ repo_head: PILOT_EXPECTED_HEAD, worktree_clean: true, active_next_action: PILOT_ACTIVE_NEXT_ACTION }),
      credentialProvider: async () => { credentialCalls += 1; return { key: "mock" }; },
      exactMutationClient: {
        request: async () => {
          networkCalls += 1;
          throw new Error("mailerlite_network_or_timeout");
        },
      },
    };
    try {
      await expect(run(dualLiveArgs(paths), deps)).rejects.toThrow("mailerlite_network_or_timeout");
      await expect(run(dualLiveArgs(paths), deps)).rejects.toThrow("blocked_pilot_operation_already_claimed_no_retry");
      expect(networkCalls).toBe(1);
      expect(credentialCalls).toBe(2);
      const lock = JSON.parse(await readFile(join(roots.privatePilotRoot, "locks", `${PILOT_OPERATION_ID}.json`), "utf8"));
      const receipt = JSON.parse(await readFile(paths.receiptJson, "utf8"));
      expect(lock.state).toBe("attempting");
      expect(lock.retry_allowed).toBe(false);
      expect(receipt.mutation_attempted).toBe(true);
      expect(receipt.mutation_executed).toBe(false);
      expect(receipt.mutation_result_status).toBe("unknown_blocked_no_retry");
      expectNoSensitiveStrings(JSON.stringify(receipt));
    } finally { await rm(dir, { recursive: true, force: true }); }
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

  test("dual producer-to-consumer contract binds final check to exact packet bytes and operation", async () => {
    const { dir, roots, paths } = await prepareDualLivePaths();
    const privatePathIdentifier = "private-candidate-handle-987654";
    paths.finalCheckPrivateResultJson = join(roots.privateMailerLiteRoot, privatePathIdentifier, "final-check-private-result.json");
    paths.finalCheckPrivateResultMd = join(roots.privateMailerLiteRoot, privatePathIdentifier, "final-check-private-result.md");
    let finalCheckCredentialCalls = 0;
    try {
      await runFinalCheck(finalCheckLiveArgs(paths), {
        roots,
        completedAt: FRESH_CHECKED_AT,
        runId: "crm_core_mailerlite_dual_final_check_binding_test",
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
      const packetBytes = await readFile(paths.privatePacket);
      const redactedFinalCheckText = await readFile(paths.finalCheck, "utf8");
      const redactedFinalCheck = JSON.parse(redactedFinalCheckText);
      const privateBinding = JSON.parse(await readFile(paths.finalCheckPrivateResultJson, "utf8"));
      expect(redactedFinalCheck.packet_id).toBe("redacted_private_packet");
      expect(redactedFinalCheck.packet_binding_status).toBe("private_exact_packet_bound");
      expect(redactedFinalCheckText).not.toContain(PILOT_PACKET_ID);
      expect(redactedFinalCheckText).not.toContain(privatePathIdentifier);
      expect(redactedFinalCheckText).not.toContain(paths.finalCheckPrivateResultJson);
      expect(redactedFinalCheck.private_result_path_labels).toEqual([
        "owner_only_private_result_json",
        "owner_only_private_result_markdown",
      ]);
      expect(privateBinding.packet_binding_contract_version).toBe(FINAL_CHECK_PRIVATE_PACKET_BINDING_CONTRACT_VERSION);
      expect(privateBinding.packet_sha256_private).toBe(sha256(packetBytes));
      expect(privateBinding.operation_id_private).toBe(PILOT_OPERATION_ID);
      expect(privateBinding.operation_class_private).toBe(PILOT_DUAL_GROUP_OPERATION_CLASS);

      const preflightReceipt = await run(dualPreflightArgs(paths), {
        roots,
        nowMs: NOW_MS,
        executionContextProvider: async () => ({ repo_head: PILOT_EXPECTED_HEAD, worktree_clean: true, active_next_action: PILOT_ACTIVE_NEXT_ACTION }),
      });
      expect(finalCheckCredentialCalls).toBe(1);
      expect(preflightReceipt.mutation_result_status).toBe("preflight_only_ready_for_exact_mutation_approval");
      expect(preflightReceipt.group_count).toBe(2);
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

  test("POST /api/subscribers is sent once relative to the configured API base", async () => {
    const urls: string[] = [];
    const client = createMailerLiteExactMutationClient({
      options: { apiBase: "https://connect.mailerlite.test/api", timeoutMs: 1000 },
      key: "mock-secret-value",
      fetchImpl: async (url: URL | string) => {
        urls.push(String(url));
        return new Response("{}", { status: 200 });
      },
    });

    await executeExactMutation({
      client,
      payload: {
        email: FAKE_EMAIL,
        fields: { name: "Synthetic Person" },
        groups: [FAKE_CONFIRMED_GROUP_REFERENCE],
      },
    });

    expect(client.calls).toEqual([{ method: "POST", path: "/api/subscribers" }]);
    expect(urls).toEqual(["https://connect.mailerlite.test/api/subscribers"]);
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
