import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { chmod, link, mkdir, mkdtemp, readFile, realpath, rename, rm, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, test } from "vitest";

import {
  ACTIVE_TRIGGER_CORRECTION_APPROVAL_CONTRACT_VERSION,
  ACTIVE_TRIGGER_CORRECTION_APPROVAL_PHRASE,
  DEFAULT_API_BASE,
  LEGACY_MISSION_CONTRACT_APPROVAL_CONTRACT_VERSION,
  LEGACY_MISSION_CONTRACT_APPROVAL_PHRASE,
  MISSION_ACTIVE_NEXT_ACTION,
  MISSION_CONTRACT_APPROVAL_CONTRACT_VERSION,
  MISSION_CONTRACT_APPROVAL_PHRASE,
  CORRECTION_OPERATION_CLASS,
  CORRECTION_PACKET_CONTRACT_VERSION,
  GUARD_STATUS,
  assertAllowedCorrectionRequest,
  assertAllowedExactAutomationRequest,
  classifyExactAutomationMapping,
  controlledInboxQuery,
  controlledMailboxAnchorIsExactGmailPlus,
  controlledMailboxProfileMatchesAnchor,
  createFileBridgeMailboxEvidenceProvider,
  createMailerLiteActiveTriggerCorrectionClient,
  exactAutomationGetPath,
  firstEmailLocatorFromAutomation,
  gmailAuthenticatedAccountForAnchor,
  mutationAttemptLimiter,
  parseGogMessageIdResult,
  parseArgs,
  run,
  searchControlledInboxIds,
  subscriberGetPath,
  validateActiveTriggerCorrectionApprovalPhrase,
  validateActiveTriggerCorrectionPacket,
} from "../scripts/crm-vnext-mailerlite-existing-subscriber-active-trigger-correction.mjs";
import {
  ACTIVE_TRIGGER_CORRECTION_APPROVAL_CONTRACT_VERSION as SHARED_APPROVAL_VERSION,
  ACTIVE_TRIGGER_CORRECTION_APPROVAL_PHRASE as SHARED_APPROVAL_PHRASE,
  LEGACY_MISSION_CONTRACT_APPROVAL_CONTRACT_VERSION as SHARED_LEGACY_MISSION_APPROVAL_VERSION,
  LEGACY_MISSION_CONTRACT_APPROVAL_PHRASE as SHARED_LEGACY_MISSION_APPROVAL_PHRASE,
  MISSION_CONTRACT_APPROVAL_CONTRACT_VERSION as SHARED_MISSION_APPROVAL_VERSION,
  MISSION_CONTRACT_APPROVAL_PHRASE as SHARED_MISSION_APPROVAL_PHRASE,
} from "../scripts/crm-vnext-mailerlite-active-trigger-correction-approval-contract.mjs";
import {
  CORRECTION_PACKET_CONTRACT_VERSION as SHARED_PACKET_VERSION,
} from "../scripts/crm-vnext-mailerlite-active-trigger-correction-contract.mjs";

const execFileAsync = promisify(execFile);
const SCRIPT = "scripts/crm-vnext-mailerlite-existing-subscriber-active-trigger-correction.mjs";
const EXPECTED_SCRIPT = "crm:vnext:mailerlite-existing-subscriber-active-trigger-correction";
const FAKE_EMAIL = "person@example.test";
const FAKE_GMAIL_BASE = "person.fixture@gmail.com";
const FAKE_GMAIL_PLUS = "person.fixture+controlled-proof@gmail.com";
const FAKE_SUBSCRIBER_ID = "sub_fake_existing_001";
const FAKE_ACTIVE_GROUP = "grp_fake_active_trigger_001";
const FAKE_PRIOR_GROUP = "grp_fake_prior_non_active_002";
const FAKE_OTHER_GROUP = "grp_fake_other_existing_003";
const FAKE_AUTOMATION_ID = "aut_fake_exact_onboarding_001";
const FAKE_FIRST_EMAIL_SUBJECT = "Welcome fixture subject";
const FAKE_FIRST_EMAIL_SENDER = "sender@example.test";
const FAKE_MESSAGE_ID = "msg_fake_first_email_001";
const MISSION_RUN_ID = "crm_core_mission_contract_2026_07_11_v2_run_001";
const FILE_BRIDGE_BUDGET_CLAIM = {
  approval_contract_version: MISSION_CONTRACT_APPROVAL_CONTRACT_VERSION,
  run_id: MISSION_RUN_ID,
  packet_id: "packet_file_bridge_fixture_001",
  mailbox_check_ordinal: 4,
};
const EXPECTED_HEAD = "a".repeat(40);
const MISSION_NOW = new Date("2026-07-11T18:00:00.000Z");
const FAKE_TOKEN = "Bearer fake_secret_token";
const RAW_PAYLOAD = "rawPayloadFixture";
const sensitiveStrings = [
  FAKE_EMAIL,
  FAKE_GMAIL_BASE,
  FAKE_GMAIL_PLUS,
  FAKE_SUBSCRIBER_ID,
  FAKE_ACTIVE_GROUP,
  FAKE_PRIOR_GROUP,
  FAKE_OTHER_GROUP,
  FAKE_AUTOMATION_ID,
  FAKE_FIRST_EMAIL_SUBJECT,
  FAKE_FIRST_EMAIL_SENDER,
  FAKE_MESSAGE_ID,
  FAKE_TOKEN,
  RAW_PAYLOAD,
  "Authorization",
  "MAILERLITE_API_KEY",
  "credentialFingerprint",
];

const expectNoSensitiveStrings = (content: string) => {
  for (const value of sensitiveStrings) expect(content).not.toContain(value);
};

const publishFileBridgeResponse = async ({
  bridgeDir,
  request,
  profileEmail = FAKE_EMAIL,
  consumptionOverrides = {},
  responseOverrides = {},
  responseExtras = {},
}: {
  bridgeDir: string;
  request: Record<string, unknown>;
  profileEmail?: string;
  consumptionOverrides?: Record<string, unknown>;
  responseOverrides?: Record<string, unknown>;
  responseExtras?: Record<string, unknown>;
}) => {
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 5));
  const consumption = {
    schema_version: request.schema_version,
    request_id: request.request_id,
    request_nonce_private: request.request_nonce_private,
    request_digest_private: request.request_digest_private,
    mission_binding_private: request.mission_binding_private,
    consumption_status: "claimed_before_connector_call",
    retry_allowed: false,
    claimed_at_epoch_seconds: request.requested_at_epoch_seconds,
    ...consumptionOverrides,
  };
  const consumptionPath = join(bridgeDir, `${request.request_id}.consumed.json`);
  const consumptionTempPath = `${consumptionPath}.tmp`;
  await writeFile(consumptionTempPath, `${JSON.stringify(consumption)}\n`, { encoding: "utf8", mode: 0o600, flag: "wx" });
  await rename(consumptionTempPath, consumptionPath);
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 2));
  const response = {
    schema_version: request.schema_version,
    request_id: request.request_id,
    request_nonce_private: request.request_nonce_private,
    request_digest_private: request.request_digest_private,
    mission_binding_private: request.mission_binding_private,
    connector_operation: "gmail_search_email_ids",
    query_binding_status: "matched",
    profile_email_private: profileEmail,
    id_digests_private: [createHash("sha256").update(FAKE_MESSAGE_ID).digest("hex")],
    has_more: false,
    search_executed_at_epoch_seconds: request.requested_at_epoch_seconds,
    worker_consumption_status: "consumed_once",
    ...responseOverrides,
    ...responseExtras,
  };
  const responseBytes = `${JSON.stringify(response)}\n`;
  const responsePath = join(bridgeDir, `${request.request_id}.response.json`);
  const responseTempPath = `${responsePath}.tmp`;
  await writeFile(responseTempPath, responseBytes, { encoding: "utf8", mode: 0o600, flag: "wx" });
  await rename(responseTempPath, responsePath);
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 2));
  const ready = {
    schema_version: request.schema_version,
    request_id: request.request_id,
    request_nonce_private: request.request_nonce_private,
    request_digest_private: request.request_digest_private,
    response_digest_private: createHash("sha256").update(responseBytes).digest("hex"),
    publication_status: "atomic_response_ready",
  };
  const readyPath = join(bridgeDir, `${request.request_id}.ready.json`);
  const readyTempPath = `${readyPath}.tmp`;
  await writeFile(readyTempPath, `${JSON.stringify(ready)}\n`, { encoding: "utf8", mode: 0o600, flag: "wx" });
  await rename(readyTempPath, readyPath);
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

const subscriber = (groups: string[], status = "active", email = FAKE_GMAIL_PLUS, id = FAKE_SUBSCRIBER_ID) => ({
  subscriber: {
    id,
    email,
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
  const legacyBudgetDir = join(roots.privateMailerLiteRoot, "controlled-welcome-flow", "mission-attempt-locks");
  await mkdir(legacyBudgetDir, { recursive: true });
  await writeFile(join(legacyBudgetDir, "mission-contract-2026-07-11-v1--budget-state.json"), `${JSON.stringify({
    schema_version: "crm-core-mailerlite-mission-budget-state-v1",
    approval_contract_version: LEGACY_MISSION_CONTRACT_APPROVAL_CONTRACT_VERSION,
    pre_effect_live_attempt_count: 3,
    mailbox_evidence_check_count: 3,
    last_run_id: "synthetic_v1_attempt_003",
    last_packet_id: "synthetic_v1_packet_003",
  }, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  return { dir, roots };
};

const makePaths = async (packetOverrides: Record<string, unknown> = {}) => {
  const { dir, roots } = await makeTempRoots();
  const paths = {
    approvalPhraseFile: join(dir, "approval.txt"),
    privatePacket: join(roots.privateMailerLiteRoot, "correction-packet.json"),
    privateResultJson: join(roots.privateMailerLiteRoot, "correction-result.json"),
    privateResultMd: join(roots.privateMailerLiteRoot, "correction-result.md"),
    privateMailboxBridgeDir: join(roots.privateMailerLiteRoot, "controlled-mailbox-bridge-v2"),
    receiptJson: join(roots.redactedReceiptRoot, "correction-receipt.json"),
    receiptMd: join(roots.redactedReceiptRoot, "correction-receipt.md"),
  };
  await writeFile(paths.approvalPhraseFile, `${MISSION_CONTRACT_APPROVAL_PHRASE}\n`, { encoding: "utf8", mode: 0o600 });
  await writeFile(paths.privatePacket, `${JSON.stringify(missionPacket(packetOverrides), null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  return { dir, roots, paths };
};

const liveArgs = (paths: Record<string, string>, approvalPhraseFile = paths.approvalPhraseFile) => [
  "--allow-live-existing-subscriber-active-trigger-correction",
  "--approval-phrase-file",
  approvalPhraseFile,
  "--approval-contract-version",
  MISSION_CONTRACT_APPROVAL_CONTRACT_VERSION,
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
  "--expected-repo-head",
  EXPECTED_HEAD,
  "--expected-active-next-action",
  MISSION_ACTIVE_NEXT_ACTION,
  "--expected-packet-id",
  "crm_core_mission_contract_2026_07_11_v2_execution_packet",
  "--run-id",
  MISSION_RUN_ID,
  "--mailbox-evidence-provider",
  "file-bridge",
  "--private-mailbox-bridge-dir",
  paths.privateMailboxBridgeDir,
];

const missionPacket = (overrides: Record<string, unknown> = {}) => packet({
  packet_id: "crm_core_mission_contract_2026_07_11_v2_execution_packet",
  mission_contract_version: MISSION_CONTRACT_APPROVAL_CONTRACT_VERSION,
  mission_run_id: MISSION_RUN_ID,
  mission_created_at: "2026-07-11T17:30:00.000Z",
  lineage_contract_version: LEGACY_MISSION_CONTRACT_APPROVAL_CONTRACT_VERSION,
  lineage_source_packet_id: "synthetic_v1_packet_003",
  lineage_identity_binding_status: "verified_exact_private_values_unchanged_from_v1_source_packet",
  expected_repo_head: EXPECTED_HEAD,
  expected_active_next_action: MISSION_ACTIVE_NEXT_ACTION,
  private_lookup: {
    existing_subscriber_lookup_anchor: FAKE_GMAIL_PLUS,
    active_live_trigger_group_reference: FAKE_ACTIVE_GROUP,
    prior_non_active_group_reference: FAKE_PRIOR_GROUP,
    active_onboarding_automation_reference: FAKE_AUTOMATION_ID,
  },
  ...overrides,
});

const makeMissionPaths = async () => {
  return makePaths();
};

const missionArgs = (paths: Record<string, string>) => liveArgs(paths);

const executionContextProvider = async () => ({
  repo_head: EXPECTED_HEAD,
  worktree_clean: true,
  active_next_action: MISSION_ACTIVE_NEXT_ACTION,
});

const automationDetail = (overrides: Record<string, unknown> = {}) => ({
  data: {
    id: FAKE_AUTOMATION_ID,
    enabled: true,
    complete: true,
    broken: false,
    triggers: [{
      type: "subscriber_joins_group",
      group_ids: [FAKE_ACTIVE_GROUP],
      groups: [{ id: FAKE_ACTIVE_GROUP }],
      exclude_group_ids: [],
      complete: true,
      broken: false,
    }],
    steps: [{
      id: "step_fake_first_email_001",
      parent_id: null,
      type: "email",
      subject: FAKE_FIRST_EMAIL_SUBJECT,
      from: FAKE_FIRST_EMAIL_SENDER,
      complete: true,
      broken: false,
    }],
    ...overrides,
  },
});

const missionDeps = (deps: Record<string, unknown> = {}) => ({
  now: MISSION_NOW,
  executionContextProvider,
  automationClient: { request: async () => automationDetail() },
  mailboxEvidenceProvider: {
    search: async ({ phase }: { phase: string }) => ({
      ok: true,
      has_more: false,
      ids_private: phase === "baseline" ? [] : [FAKE_MESSAGE_ID],
    }),
  },
  sleep: async () => {},
  ...deps,
});

const runMission = (args: string[], deps: Record<string, unknown> = {}) => run(args, missionDeps(deps));

const replaceArgValue = (args: string[], flag: string, value: string) => {
  const next = [...args];
  const index = next.indexOf(flag);
  if (index < 0) throw new Error(`missing_test_flag:${flag}`);
  next[index + 1] = value;
  return next;
};

const alternateOutputPaths = (paths: Record<string, string>, roots: Record<string, string>, suffix: string) => ({
  ...paths,
  privateResultJson: join(roots.privateMailerLiteRoot, `correction-result-${suffix}.json`),
  privateResultMd: join(roots.privateMailerLiteRoot, `correction-result-${suffix}.md`),
  receiptJson: join(roots.redactedReceiptRoot, `correction-receipt-${suffix}.json`),
  receiptMd: join(roots.redactedReceiptRoot, `correction-receipt-${suffix}.md`),
});

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
  test("contract modules and public v2 document export one exact current approval", async () => {
    expect(CORRECTION_PACKET_CONTRACT_VERSION).toBe("mailerlite_existing_subscriber_active_trigger_correction_packet_v1");
    expect(CORRECTION_PACKET_CONTRACT_VERSION).toBe(SHARED_PACKET_VERSION);
    expect(ACTIVE_TRIGGER_CORRECTION_APPROVAL_CONTRACT_VERSION).toBe("mailerlite_active_trigger_correction_approval_phrase_v1_2026-07-11");
    expect(ACTIVE_TRIGGER_CORRECTION_APPROVAL_CONTRACT_VERSION).toBe(SHARED_APPROVAL_VERSION);
    expect(ACTIVE_TRIGGER_CORRECTION_APPROVAL_PHRASE).toBe(SHARED_APPROVAL_PHRASE);
    expect(LEGACY_MISSION_CONTRACT_APPROVAL_CONTRACT_VERSION).toBe("Mission Contract 2026-07-11.v1");
    expect(LEGACY_MISSION_CONTRACT_APPROVAL_CONTRACT_VERSION).toBe(SHARED_LEGACY_MISSION_APPROVAL_VERSION);
    expect(LEGACY_MISSION_CONTRACT_APPROVAL_PHRASE).toBe(SHARED_LEGACY_MISSION_APPROVAL_PHRASE);
    expect(MISSION_CONTRACT_APPROVAL_CONTRACT_VERSION).toBe("Mission Contract 2026-07-11.v2");
    expect(MISSION_CONTRACT_APPROVAL_CONTRACT_VERSION).toBe(SHARED_MISSION_APPROVAL_VERSION);
    expect(MISSION_CONTRACT_APPROVAL_PHRASE).toBe(SHARED_MISSION_APPROVAL_PHRASE);
    expect(MISSION_ACTIVE_NEXT_ACTION).toBe("crm_core_controlled_welcome_flow_active_trigger_correction_and_first_email_proof_awaiting_mission_v2_approval_v0");
    const contractDoc = await readFile(
      join(process.cwd(), "docs/crm-vnext/crm-core-controlled-welcome-flow-mission-contract-2026-07-11-v2.md"),
      "utf8",
    );
    expect(contractDoc).toContain(MISSION_CONTRACT_APPROVAL_PHRASE);
    expect(GUARD_STATUS).toBe("implemented_and_mock_tested");
  });

  test("approval template mode prints the current v2 mission template safely and does not call dependencies", async () => {
    const direct = await run(["--print-approval-template"], {
      credentialProvider: async () => { throw new Error("credential_provider_called"); },
      correctionClient: { request: async () => { throw new Error("network_client_called"); } },
    });
    expect(direct.approval_template_printed).toBe(true);
    const { stdout, stderr } = await execFileAsync("node", [SCRIPT, "--print-approval-template"], { cwd: process.cwd() });
    const payload = JSON.parse(stdout);
    expect(payload.contract_version).toBe(MISSION_CONTRACT_APPROVAL_CONTRACT_VERSION);
    expect(payload.approval_phrase).toBe(MISSION_CONTRACT_APPROVAL_PHRASE);
    expectNoSensitiveStrings(`${stdout}\n${stderr}`);
  });

  test("exact phrase validation passes and paraphrased phrase blocks", async () => {
    expect(validateActiveTriggerCorrectionApprovalPhrase(ACTIVE_TRIGGER_CORRECTION_APPROVAL_PHRASE, ACTIVE_TRIGGER_CORRECTION_APPROVAL_CONTRACT_VERSION).ok).toBe(true);
    expect(validateActiveTriggerCorrectionApprovalPhrase(MISSION_CONTRACT_APPROVAL_PHRASE, MISSION_CONTRACT_APPROVAL_CONTRACT_VERSION).ok).toBe(true);
    expect(validateActiveTriggerCorrectionApprovalPhrase(`${MISSION_CONTRACT_APPROVAL_PHRASE.replace(/\n/g, "\r\n")}\r\n`, MISSION_CONTRACT_APPROVAL_CONTRACT_VERSION).ok).toBe(true);
    expect(validateActiveTriggerCorrectionApprovalPhrase(MISSION_CONTRACT_APPROVAL_PHRASE.replace(/\n/g, "   "), MISSION_CONTRACT_APPROVAL_CONTRACT_VERSION).reason).toBe("blocked_approval_phrase_mismatch");
    expect(validateActiveTriggerCorrectionApprovalPhrase("I approve the same thing", ACTIVE_TRIGGER_CORRECTION_APPROVAL_CONTRACT_VERSION).reason).toBe("blocked_approval_phrase_mismatch");
    expect(validateActiveTriggerCorrectionApprovalPhrase(MISSION_CONTRACT_APPROVAL_PHRASE, ACTIVE_TRIGGER_CORRECTION_APPROVAL_CONTRACT_VERSION).reason).toBe("blocked_approval_phrase_mismatch");
    expect(validateActiveTriggerCorrectionApprovalPhrase(ACTIVE_TRIGGER_CORRECTION_APPROVAL_PHRASE, MISSION_CONTRACT_APPROVAL_CONTRACT_VERSION).reason).toBe("blocked_approval_phrase_mismatch");
    expect(validateActiveTriggerCorrectionApprovalPhrase(MISSION_CONTRACT_APPROVAL_PHRASE, undefined).reason).toBe("blocked_approval_contract_version_missing");
    expect(validateActiveTriggerCorrectionApprovalPhrase(MISSION_CONTRACT_APPROVAL_PHRASE, "unknown").reason).toBe("blocked_approval_contract_version_unknown");
    const { dir, roots, paths } = await makePaths();
    let credentialCalls = 0;
    try {
      await writeFile(paths.approvalPhraseFile, "I approve the same thing\n", "utf8");
      await expect(runMission(liveArgs(paths), { roots, credentialProvider: async () => { credentialCalls += 1; return { key: "mock" }; } })).rejects.toThrow("blocked_approval_phrase_mismatch");
      expect(credentialCalls).toBe(0);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("missing phrase blocks before credentials", async () => {
    const { dir, roots, paths } = await makePaths();
    let credentialCalls = 0;
    try {
      await rm(paths.approvalPhraseFile, { force: true });
      await expect(runMission(liveArgs(paths), { roots, credentialProvider: async () => { credentialCalls += 1; return { key: "mock" }; } })).rejects.toThrow("blocked_approval_phrase_missing");
      expect(credentialCalls).toBe(0);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("missing explicit approval contract version blocks before credentials", async () => {
    const { dir, roots, paths } = await makePaths();
    let credentialCalls = 0;
    const args = liveArgs(paths);
    const versionIndex = args.indexOf("--approval-contract-version");
    args.splice(versionIndex, 2);
    try {
      await expect(runMission(args, {
        roots,
        credentialProvider: async () => { credentialCalls += 1; return { key: "mock" }; },
      })).rejects.toThrow("blocked_approval_contract_version_missing");
      expect(credentialCalls).toBe(0);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("v2 rejects the default or direct gog route before credentials and connector calls", async () => {
    const { dir, roots, paths } = await makePaths();
    let credentialCalls = 0;
    let connectorCalls = 0;
    const args = liveArgs(paths);
    for (const flag of ["--private-mailbox-bridge-dir", "--mailbox-evidence-provider"]) {
      const index = args.indexOf(flag);
      args.splice(index, 2);
    }
    try {
      await expect(runMission(args, {
        roots,
        credentialProvider: async () => { credentialCalls += 1; return { key: "mock" }; },
        mailboxEvidenceProvider: { search: async () => { connectorCalls += 1; return { ok: true, has_more: false, ids_private: [] }; } },
      })).rejects.toThrow("blocked_mission_v2_requires_prearmed_file_bridge_publisher");
      await expect(runMission([...args, "--preflight-only"], {
        roots,
        credentialProvider: async () => { credentialCalls += 1; return { key: "mock" }; },
      })).rejects.toThrow("blocked_mission_v2_requires_prearmed_file_bridge_publisher");
      expect(credentialCalls).toBe(0);
      expect(connectorCalls).toBe(0);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("exhausted Mission Contract v1 remains registered for audit but cannot execute the live route", async () => {
    const { dir, roots, paths } = await makePaths();
    let credentialCalls = 0;
    try {
      await writeFile(paths.approvalPhraseFile, `${LEGACY_MISSION_CONTRACT_APPROVAL_PHRASE}\n`, { encoding: "utf8", mode: 0o600 });
      const args = replaceArgValue(liveArgs(paths), "--approval-contract-version", LEGACY_MISSION_CONTRACT_APPROVAL_CONTRACT_VERSION);
      await expect(runMission(args, {
        roots,
        credentialProvider: async () => { credentialCalls += 1; return { key: "mock" }; },
      })).rejects.toThrow("blocked_live_requires_current_mission_contract");
      await expect(runMission([...args, "--preflight-only"], {
        roots,
        credentialProvider: async () => { credentialCalls += 1; return { key: "mock" }; },
      })).rejects.toThrow("blocked_preflight_requires_current_mission_contract");
      expect(credentialCalls).toBe(0);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("v2 blocks before credentials when the exact v1 3/3 and 3/8 lineage is missing or changed", async () => {
    for (const mode of ["missing", "changed"]) {
      const { dir, roots, paths } = await makePaths();
      let credentialCalls = 0;
      const legacyStatePath = join(
        roots.privateMailerLiteRoot,
        "controlled-welcome-flow",
        "mission-attempt-locks",
        "mission-contract-2026-07-11-v1--budget-state.json",
      );
      try {
        if (mode === "missing") {
          await rm(legacyStatePath);
        } else {
          await writeFile(legacyStatePath, `${JSON.stringify({
            schema_version: "crm-core-mailerlite-mission-budget-state-v1",
            approval_contract_version: LEGACY_MISSION_CONTRACT_APPROVAL_CONTRACT_VERSION,
            pre_effect_live_attempt_count: 3,
            mailbox_evidence_check_count: 0,
          }, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
        }
        await expect(runMission(liveArgs(paths), {
          roots,
          credentialProvider: async () => { credentialCalls += 1; return { key: "mock" }; },
        })).rejects.toThrow(mode === "missing"
          ? "blocked_v2_lineage_budget_state_missing"
          : "blocked_v2_lineage_budget_state_invalid");
        expect(credentialCalls).toBe(0);
      } finally { await rm(dir, { recursive: true, force: true }); }
    }
  });

  test("v2 blocks before credentials if a v1 terminal-effect lock exists", async () => {
    const { dir, roots, paths } = await makePaths();
    let credentialCalls = 0;
    const legacyLockPath = join(
      roots.privateMailerLiteRoot,
      "controlled-welcome-flow",
      "mission-attempt-locks",
      "mission-contract-2026-07-11-v1--active-trigger-correction-and-first-email-proof.json",
    );
    try {
      await writeFile(legacyLockPath, "{}\n", { encoding: "utf8", mode: 0o600 });
      await expect(runMission(liveArgs(paths), {
        roots,
        credentialProvider: async () => { credentialCalls += 1; return { key: "mock" }; },
      })).rejects.toThrow("blocked_v2_lineage_terminal_lock_present");
      expect(credentialCalls).toBe(0);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("approval file must be a private owner-only regular file", async () => {
    const { dir, roots, paths } = await makePaths();
    let credentialCalls = 0;
    try {
      await chmod(paths.approvalPhraseFile, 0o644);
      await expect(runMission(liveArgs(paths), {
        roots,
        credentialProvider: async () => { credentialCalls += 1; return { key: "mock" }; },
      })).rejects.toThrow("blocked_approval_file_permissions");
      expect(credentialCalls).toBe(0);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("private v2 packet must be a stable owner-only 0600 file without symlink or hard-link substitution", async () => {
    for (const mode of ["permissions", "hardlink", "symlink", "parent_symlink_escape"]) {
      const { dir, roots, paths } = await makePaths();
      let credentialCalls = 0;
      try {
        if (mode === "permissions") {
          await chmod(paths.privatePacket, 0o644);
        } else if (mode === "hardlink") {
          await link(paths.privatePacket, join(roots.privateMailerLiteRoot, "packet-hard-link.json"));
        } else if (mode === "symlink") {
          const target = join(roots.privateMailerLiteRoot, "packet-symlink-target.json");
          await rename(paths.privatePacket, target);
          await symlink(target, paths.privatePacket);
        } else {
          const packetBytes = await readFile(paths.privatePacket);
          const outsideRoot = join(dir, "outside-private-root");
          const outsidePacket = join(outsideRoot, "packet.json");
          const linkedParent = join(roots.privateMailerLiteRoot, "linked-parent");
          await mkdir(outsideRoot);
          await writeFile(outsidePacket, packetBytes, { mode: 0o600 });
          await symlink(outsideRoot, linkedParent);
          paths.privatePacket = join(linkedParent, "packet.json");
        }
        await expect(runMission(liveArgs(paths), {
          roots,
          credentialProvider: async () => { credentialCalls += 1; return { key: "mock" }; },
        })).rejects.toThrow("blocked_private_packet_permissions_or_stability");
        expect(credentialCalls).toBe(0);
      } finally { await rm(dir, { recursive: true, force: true }); }
    }
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
      await expect(runMission(liveArgs({ ...paths, privateResultJson: join(process.cwd(), "private-result.json") }), { roots, credentialProvider: async () => { credentialCalls += 1; return { key: "mock" }; } })).rejects.toThrow("blocked_output_path_policy");
      expect(credentialCalls).toBe(0);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("preflight-only passes canonical synthetic packet without credentials, network, or mutation", async () => {
    const { dir, roots, paths } = await makePaths();
    let credentialCalls = 0;
    let networkCalls = 0;
    try {
      const receipt = await runMission(preflightArgs(paths), {
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
      const receipt = await runMission(liveArgs(paths), {
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
      const receipt = await runMission(liveArgs(paths), {
        roots,
        credentialProvider: async () => ({ key: "mock" }),
        correctionClient: makeClient([{ subscriber_lookup_status: "not_found" }], requests),
      });
      expect(receipt.correction_result_status).toBe("blocked_subscriber_not_found");
      expect(receipt.mutation_endpoint_call_count).toBe(0);
      expect(requests.map((request) => request.method)).toEqual(["GET"]);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("live lookup requests group membership through the proven subscriber route", () => {
    expect(subscriberGetPath(FAKE_EMAIL)).toBe(`/api/subscribers/${encodeURIComponent(FAKE_EMAIL)}?include=groups`);
    expect(assertAllowedCorrectionRequest({ method: "GET", path: subscriberGetPath(FAKE_EMAIL) })).toBe(true);
  });

  test("live lookup converts a MailerLite 404 into a no-mutation not-found result", async () => {
    const calls: Array<Record<string, unknown>> = [];
    const client = createMailerLiteActiveTriggerCorrectionClient({
      options: { apiBase: DEFAULT_API_BASE, timeoutMs: 1_000 },
      key: "mock",
      calls,
      fetchImpl: async () => new Response(JSON.stringify({ message: "not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }),
    });

    const response = await client.request({ method: "GET", path: subscriberGetPath(FAKE_EMAIL) });

    expect(response).toEqual({ subscriber_lookup_status: "not_found", status: 404 });
    expect(calls).toEqual([{ method: "GET", path: subscriberGetPath(FAKE_EMAIL) }]);
  });

  test("unsafe subscriber statuses block with zero mutation calls", async () => {
    for (const status of ["unsubscribed", "bounced", "junk", "inactive"]) {
      const { dir, roots, paths } = await makePaths();
      const requests: Array<Record<string, unknown>> = [];
      try {
        const receipt = await runMission(liveArgs(paths), {
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
      const receipt = await runMission(liveArgs(paths), {
        roots,
        credentialProvider: async () => ({ key: "mock" }),
        correctionClient: makeClient([subscriber([FAKE_PRIOR_GROUP, FAKE_ACTIVE_GROUP]), subscriber([FAKE_ACTIVE_GROUP, FAKE_PRIOR_GROUP])], requests),
      });
      expect(receipt.correction_result_status).toBe("already_present_idempotent_noop_verified");
      expect(receipt.correction_executed).toBe(false);
      expect(receipt.mutation_endpoint_call_count).toBe(0);
      expect(requests.map((request) => request.method)).toEqual(["GET", "GET"]);
      expect(receipt.all_prior_groups_preservation_status).toBe("all_preserved");
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("active trigger absent performs exactly one POST assignment and preserves prior group", async () => {
    const { dir, roots, paths } = await makePaths();
    const requests: Array<Record<string, unknown>> = [];
    try {
      const receipt = await runMission(liveArgs(paths), {
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
      const receipt = await runMission(liveArgs(paths), {
        roots,
        credentialProvider: async () => ({ key: "mock" }),
        correctionClient: makeClient([subscriber([FAKE_PRIOR_GROUP]), subscriber([FAKE_PRIOR_GROUP])], requests),
      });
      expect(receipt.correction_result_status).toBe("blocked_post_correction_verification_failed_no_retry");
      expect(receipt.post_correction_verification_status).toBe("failed_or_unknown");
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("mission contract binds exact automation, clean execution context, and one exact add-only transition", async () => {
    const { dir, roots, paths } = await makeMissionPaths();
    const correctionRequests: Array<Record<string, unknown>> = [];
    const automationRequests: Array<Record<string, unknown>> = [];
    try {
      const receipt = await runMission(missionArgs(paths), {
        roots,
        now: MISSION_NOW,
        executionContextProvider,
        credentialProvider: async () => ({ key: "mock" }),
        automationClient: { request: async (request: Record<string, unknown>) => { automationRequests.push(request); return automationDetail(); } },
        correctionClient: makeClient([
          subscriber([FAKE_PRIOR_GROUP, FAKE_OTHER_GROUP]),
          subscriber([FAKE_OTHER_GROUP, FAKE_PRIOR_GROUP, FAKE_ACTIVE_GROUP]),
        ], correctionRequests),
      });
      expect(receipt.correction_result_status).toBe("correction_executed_verified");
      expect(receipt.approval_contract_version).toBe(MISSION_CONTRACT_APPROVAL_CONTRACT_VERSION);
      expect(receipt.execution_binding_status).toBe("passed_clean_head_active_action_packet_and_freshness_binding");
      expect(receipt.automation_trigger_mapping_status).toBe("exact_active_trigger_mapping_verified");
      expect(receipt.all_prior_groups_preservation_status).toBe("all_preserved");
      expect(receipt.group_transition_status).toBe("passed_exact_add_only_transition");
      expect(automationRequests).toEqual([
        { method: "GET", path: exactAutomationGetPath(FAKE_AUTOMATION_ID) },
        { method: "GET", path: exactAutomationGetPath(FAKE_AUTOMATION_ID) },
      ]);
      expect(correctionRequests.map((request) => request.method)).toEqual(["GET", "POST", "GET"]);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("exact automation classifier requires strict active state and one complete non-excluded group-join trigger", () => {
    expect(classifyExactAutomationMapping(automationDetail(), FAKE_AUTOMATION_ID, FAKE_ACTIVE_GROUP).ok).toBe(true);
    expect(classifyExactAutomationMapping(automationDetail({ enabled: false }), FAKE_AUTOMATION_ID, FAKE_ACTIVE_GROUP).ok).toBe(false);
    expect(classifyExactAutomationMapping(automationDetail({ triggers: [] }), FAKE_AUTOMATION_ID, FAKE_ACTIVE_GROUP).ok).toBe(false);
    expect(classifyExactAutomationMapping(automationDetail({
      triggers: [
        { type: "subscriber_joins_group", group_ids: [FAKE_ACTIVE_GROUP], complete: true, broken: false },
        { type: "subscriber_joins_group", group_ids: [FAKE_ACTIVE_GROUP], complete: true, broken: false },
      ],
    }), FAKE_AUTOMATION_ID, FAKE_ACTIVE_GROUP).ok).toBe(false);
    expect(exactAutomationGetPath(FAKE_AUTOMATION_ID)).toBe(`/api/automations/${FAKE_AUTOMATION_ID}`);
    expect(assertAllowedExactAutomationRequest({ method: "GET", path: exactAutomationGetPath(FAKE_AUTOMATION_ID), expectedAutomationReference: FAKE_AUTOMATION_ID })).toBe(true);
    expect(() => assertAllowedExactAutomationRequest({ method: "GET", path: "/api/automations", expectedAutomationReference: FAKE_AUTOMATION_ID })).toThrow("blocked_non_exact_automation_read");
  });

  test("first-email locator and Gmail ID parser stay exact and metadata-only", () => {
    const locator = firstEmailLocatorFromAutomation(automationDetail());
    expect(locator).toMatchObject({
      ok: true,
      status: "exact_first_email_locator_verified",
      subject_private: FAKE_FIRST_EMAIL_SUBJECT,
      sender_private: FAKE_FIRST_EMAIL_SENDER,
    });
    const query = controlledInboxQuery({
      mailboxAnchor: FAKE_EMAIL,
      locator,
      afterEpochSeconds: 1_700_000_000,
      beforeEpochSeconds: 1_700_000_100,
    });
    expect(query).toContain("in:inbox");
    expect(query).toContain("-in:sent");
    expect(query).toContain("-in:drafts");
    expect(parseGogMessageIdResult(JSON.stringify({ messages: [{ id: FAKE_MESSAGE_ID }] }))).toEqual({ ok: true, ids_private: [FAKE_MESSAGE_ID], has_more: false });
    expect(parseGogMessageIdResult(JSON.stringify({ messages: [{ id: FAKE_MESSAGE_ID }], nextPageToken: "more" })).has_more).toBe(true);
    expect(parseGogMessageIdResult("not-json").ok).toBe(false);
    expect(firstEmailLocatorFromAutomation(automationDetail({
      steps: [{ id: "broken-first-email", parent_id: null, type: "email", subject: FAKE_FIRST_EMAIL_SUBJECT, from: FAKE_FIRST_EMAIL_SENDER, complete: false, broken: true }],
    })).status).toBe("first_email_step_incomplete_or_broken");
  });

  test("controlled mailbox binding accepts only the exact Gmail plus-alias relation", () => {
    expect(controlledMailboxAnchorIsExactGmailPlus(FAKE_GMAIL_PLUS)).toBe(true);
    expect(controlledMailboxAnchorIsExactGmailPlus(FAKE_GMAIL_BASE)).toBe(false);
    expect(gmailAuthenticatedAccountForAnchor(FAKE_GMAIL_PLUS)).toBe(FAKE_GMAIL_BASE);
    expect(gmailAuthenticatedAccountForAnchor(FAKE_GMAIL_BASE)).toBe(FAKE_GMAIL_BASE);
    expect(controlledMailboxProfileMatchesAnchor(FAKE_GMAIL_BASE, FAKE_GMAIL_PLUS)).toBe(true);
    expect(controlledMailboxProfileMatchesAnchor(FAKE_GMAIL_BASE, FAKE_GMAIL_BASE)).toBe(true);
    expect(controlledMailboxProfileMatchesAnchor(FAKE_GMAIL_PLUS, FAKE_GMAIL_PLUS)).toBe(false);
    expect(controlledMailboxProfileMatchesAnchor("personfixture@gmail.com", FAKE_GMAIL_PLUS)).toBe(false);
    expect(controlledMailboxProfileMatchesAnchor(FAKE_GMAIL_BASE, "person.fixture+controlled-proof@googlemail.com")).toBe(false);
    expect(controlledMailboxProfileMatchesAnchor("person.fixture+other@gmail.com", FAKE_GMAIL_PLUS)).toBe(false);
    expect(controlledMailboxProfileMatchesAnchor("person.fixture@example.test", "person.fixture+controlled-proof@example.test")).toBe(false);
    expect(gmailAuthenticatedAccountForAnchor("person.fixture+@gmail.com")).toBeNull();
    expect(gmailAuthenticatedAccountForAnchor("person.fixture+one+two@gmail.com")).toBeNull();
  });

  test("production Gmail wrapper fixes binary, account, message search, ID selection, and exact bounded query inputs", async () => {
    const locator = firstEmailLocatorFromAutomation(automationDetail());
    let captured: { bin?: string; args?: string[] } = {};
    const result = await searchControlledInboxIds({
      mailboxAnchor: FAKE_GMAIL_PLUS,
      locator,
      afterEpochSeconds: 1_700_000_000,
      beforeEpochSeconds: 1_700_000_100,
      nowMs: () => 1_700_000_200_000,
      execFileImpl: async (bin: string, args: string[]) => {
        captured = { bin, args };
        return { stdout: JSON.stringify({ messages: [{ id: FAKE_MESSAGE_ID }] }), stderr: "" };
      },
    });
    expect(result).toMatchObject({ ok: true, ids_private: [FAKE_MESSAGE_ID], has_more: false });
    expect(result.source_checked_at_epoch_seconds).toBe(1_700_000_200);
    expect(captured.bin).toBe("/opt/homebrew/bin/gog");
    expect(captured.args?.slice(0, 3)).toEqual(["gmail", "messages", "search"]);
    expect(captured.args).toContain("--select=id");
    expect(captured.args).toContain("--max=2");
    expect(captured.args).not.toContain("--include-body");
    const accountIndex = captured.args?.indexOf("--account") ?? -1;
    expect(captured.args?.[accountIndex + 1]).toBe(FAKE_GMAIL_BASE);
    expect(captured.args?.[3]).toContain(`to:\"${FAKE_GMAIL_PLUS}\"`);
    expect(captured.args?.[3]).toContain(`from:\"${FAKE_FIRST_EMAIL_SENDER}\"`);
    expect(captured.args?.[3]).toContain(`subject:\"${FAKE_FIRST_EMAIL_SUBJECT}\"`);
    expect(captured.args?.[3]).toContain("after:1700000000");
    expect(captured.args?.[3]).toContain("before:1700000232");
  });

  test("private file bridge performs a 0600 request-response handshake for connector ID results", async () => {
    const dir = await realpath(await mkdtemp(join(tmpdir(), "crm-core-mailbox-file-bridge-")));
    const bridgeDir = join(dir, "bridge");
    const locator = firstEmailLocatorFromAutomation(automationDetail());
    let responseWritten = false;
    try {
      const provider = createFileBridgeMailboxEvidenceProvider({
        bridgeDir,
        privateRoot: dir,
        nowMs: () => 1_700_000_000_000,
        nonceProvider: () => "a".repeat(64),
        sleep: async () => {
          if (responseWritten) return;
          responseWritten = true;
          const request = JSON.parse(await readFile(join(bridgeDir, "01-baseline.request.json"), "utf8"));
          await publishFileBridgeResponse({ bridgeDir, request, profileEmail: FAKE_GMAIL_BASE });
        },
      });
      const result = await provider.search({
        phase: "baseline",
        mailboxAnchor: FAKE_GMAIL_PLUS,
        locator,
        afterEpochSeconds: 1_700_000_000,
        beforeEpochSeconds: 1_700_000_100,
        budgetClaim: FILE_BRIDGE_BUDGET_CLAIM,
      });
      expect(result).toEqual({
        ok: true,
        ids_private: [createHash("sha256").update(FAKE_MESSAGE_ID).digest("hex")],
        has_more: false,
        source_checked_at_epoch_seconds: 1_700_000_000,
      });
      const requestPath = join(bridgeDir, "01-baseline.request.json");
      const request = JSON.parse(await readFile(requestPath, "utf8"));
      expect(request.connector_operation).toBe("gmail_search_email_ids");
      expect(request.label_ids).toEqual(["INBOX"]);
      expect(request.max_results).toBe(2);
      expect(request.mailbox_anchor_private).toBe(FAKE_GMAIL_PLUS);
      expect(request.query_private).toContain(`to:\"${FAKE_GMAIL_PLUS}\"`);
      expect(request.mission_binding_private).toEqual(FILE_BRIDGE_BUDGET_CLAIM);
      expect(request.worker_contract).toBe("one_shot_request_id_no_reprocessing");
      expect(request.digest_contract.message_id_digest).toBe("sha256_lowercase_hex_of_utf8_raw_gmail_message_id");
      expect((await stat(requestPath)).mode & 0o777).toBe(0o600);
      expect((await stat(join(bridgeDir, "01-baseline.consumed.json"))).mode & 0o777).toBe(0o600);
      expect((await stat(join(bridgeDir, "01-baseline.ready.json"))).mode & 0o777).toBe(0o600);
      expect((await stat(bridgeDir)).mode & 0o777).toBe(0o700);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("private file bridge rejects forbidden extra private response fields", async () => {
    const dir = await realpath(await mkdtemp(join(tmpdir(), "crm-core-mailbox-file-bridge-fields-")));
    const bridgeDir = join(dir, "bridge");
    try {
      let published = false;
      const provider = createFileBridgeMailboxEvidenceProvider({
        bridgeDir,
        privateRoot: dir,
        nowMs: () => 1_700_000_000_000,
        nonceProvider: () => "b".repeat(64),
        sleep: async () => {
          if (published) return;
          published = true;
          const request = JSON.parse(await readFile(join(bridgeDir, "01-baseline.request.json"), "utf8"));
          await publishFileBridgeResponse({ bridgeDir, request, responseExtras: { snippet_private: "forbidden" } });
        },
      });
      await expect(provider.search({
        phase: "baseline",
        mailboxAnchor: FAKE_EMAIL,
        locator: firstEmailLocatorFromAutomation(automationDetail()),
        afterEpochSeconds: 1_700_000_000,
        beforeEpochSeconds: 1_700_000_100,
        budgetClaim: FILE_BRIDGE_BUDGET_CLAIM,
      })).rejects.toThrow("blocked_mailbox_bridge_response_fields_invalid");
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("private file bridge rejects a response digest mismatch", async () => {
    const dir = await realpath(await mkdtemp(join(tmpdir(), "crm-core-mailbox-file-bridge-binding-")));
    const bridgeDir = join(dir, "bridge");
    try {
      let published = false;
      const provider = createFileBridgeMailboxEvidenceProvider({
        bridgeDir,
        privateRoot: dir,
        nowMs: () => 1_700_000_000_000,
        nonceProvider: () => "c".repeat(64),
        sleep: async () => {
          if (published) return;
          published = true;
          const request = JSON.parse(await readFile(join(bridgeDir, "01-baseline.request.json"), "utf8"));
          await publishFileBridgeResponse({ bridgeDir, request, responseOverrides: { request_digest_private: "0".repeat(64) } });
        },
      });
      await expect(provider.search({
        phase: "baseline",
        mailboxAnchor: FAKE_EMAIL,
        locator: firstEmailLocatorFromAutomation(automationDetail()),
        afterEpochSeconds: 1_700_000_000,
        beforeEpochSeconds: 1_700_000_100,
        budgetClaim: FILE_BRIDGE_BUDGET_CLAIM,
      })).rejects.toThrow("blocked_mailbox_bridge_digest_mismatch");
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("private file bridge rejects body or snippet text disguised as a message ID", async () => {
    const dir = await realpath(await mkdtemp(join(tmpdir(), "crm-core-mailbox-file-bridge-id-digest-")));
    const bridgeDir = join(dir, "bridge");
    try {
      let published = false;
      const provider = createFileBridgeMailboxEvidenceProvider({
        bridgeDir,
        privateRoot: dir,
        nowMs: () => 1_700_000_000_000,
        nonceProvider: () => "f".repeat(64),
        sleep: async () => {
          if (published) return;
          published = true;
          const request = JSON.parse(await readFile(join(bridgeDir, "01-baseline.request.json"), "utf8"));
          await publishFileBridgeResponse({
            bridgeDir,
            request,
            responseOverrides: { id_digests_private: ["this is body or snippet content, not a Gmail message ID"] },
          });
        },
      });
      await expect(provider.search({
        phase: "baseline",
        mailboxAnchor: FAKE_EMAIL,
        locator: firstEmailLocatorFromAutomation(automationDetail()),
        afterEpochSeconds: 1_700_000_000,
        beforeEpochSeconds: 1_700_000_100,
        budgetClaim: FILE_BRIDGE_BUDGET_CLAIM,
      })).rejects.toThrow("blocked_mailbox_bridge_id_digests_invalid");
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("private file bridge rejects a durable consumption claim reported after the connector search", async () => {
    const dir = await realpath(await mkdtemp(join(tmpdir(), "crm-core-mailbox-file-bridge-consumption-time-")));
    const bridgeDir = join(dir, "bridge");
    try {
      let published = false;
      const provider = createFileBridgeMailboxEvidenceProvider({
        bridgeDir,
        privateRoot: dir,
        nowMs: () => 1_700_000_000_000,
        nonceProvider: () => "1".repeat(64),
        sleep: async () => {
          if (published) return;
          published = true;
          const request = JSON.parse(await readFile(join(bridgeDir, "01-baseline.request.json"), "utf8"));
          await publishFileBridgeResponse({
            bridgeDir,
            request,
            consumptionOverrides: { claimed_at_epoch_seconds: request.requested_at_epoch_seconds + 1 },
          });
        },
      });
      await expect(provider.search({
        phase: "baseline",
        mailboxAnchor: FAKE_EMAIL,
        locator: firstEmailLocatorFromAutomation(automationDetail()),
        afterEpochSeconds: 1_700_000_000,
        beforeEpochSeconds: 1_700_000_100,
        budgetClaim: FILE_BRIDGE_BUDGET_CLAIM,
      })).rejects.toThrow("blocked_mailbox_bridge_consumption_after_search");
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("private file bridge rejects preexisting or non-private bridge directories", async () => {
    const dir = await realpath(await mkdtemp(join(tmpdir(), "crm-core-mailbox-file-bridge-dir-")));
    const locator = firstEmailLocatorFromAutomation(automationDetail());
    try {
      const preexistingDir = join(dir, "preexisting");
      await mkdir(preexistingDir, { mode: 0o700 });
      const preexistingProvider = createFileBridgeMailboxEvidenceProvider({
        bridgeDir: preexistingDir,
        privateRoot: dir,
        nonceProvider: () => "d".repeat(64),
      });
      await expect(preexistingProvider.search({
        phase: "baseline",
        mailboxAnchor: FAKE_EMAIL,
        locator,
        afterEpochSeconds: 1_700_000_000,
        beforeEpochSeconds: 1_700_000_100,
        budgetClaim: FILE_BRIDGE_BUDGET_CLAIM,
      })).rejects.toThrow("blocked_mailbox_bridge_directory_preexisting");

      const wrongModeDir = join(dir, "wrong-mode");
      let modeChanged = false;
      const wrongModeProvider = createFileBridgeMailboxEvidenceProvider({
        bridgeDir: wrongModeDir,
        privateRoot: dir,
        nowMs: () => 1_700_000_000_000,
        nonceProvider: () => "e".repeat(64),
        sleep: async () => {
          if (modeChanged) return;
          modeChanged = true;
          await chmod(wrongModeDir, 0o755);
        },
      });
      await expect(wrongModeProvider.search({
        phase: "baseline",
        mailboxAnchor: FAKE_EMAIL,
        locator,
        afterEpochSeconds: 1_700_000_000,
        beforeEpochSeconds: 1_700_000_100,
        budgetClaim: FILE_BRIDGE_BUDGET_CLAIM,
      })).rejects.toThrow("blocked_mailbox_bridge_directory_permissions_or_scope");
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("mailbox baseline ambiguity stops before subscriber access or mutation", async () => {
    const { dir, roots, paths } = await makePaths();
    let correctionCalls = 0;
    try {
      const receipt = await runMission(liveArgs(paths), {
        roots,
        credentialProvider: async () => ({ key: "mock" }),
        mailboxEvidenceProvider: { search: async () => ({ ok: true, has_more: true, ids_private: [FAKE_MESSAGE_ID] }) },
        correctionClient: { request: async () => { correctionCalls += 1; return {}; } },
      });
      expect(receipt.correction_result_status).toBe("blocked_controlled_mailbox_baseline_not_verified");
      expect(receipt.mailbox_binding_status).toBe("not_verified");
      expect(receipt.mailbox_evidence_check_count).toBe(4);
      expect(correctionCalls).toBe(0);
      expect(receipt.mutation_endpoint_call_count).toBe(0);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("stale mailbox source time blocks before the assignment POST", async () => {
    const { dir, roots, paths } = await makePaths();
    const requests: Array<Record<string, unknown>> = [];
    try {
      const missionNowEpoch = Math.floor(MISSION_NOW.getTime() / 1000);
      const receipt = await runMission(liveArgs(paths), {
        roots,
        credentialProvider: async () => ({ key: "mock" }),
        mailboxEvidenceProvider: {
          search: async () => ({
            ok: true,
            has_more: false,
            ids_private: [],
            source_checked_at_epoch_seconds: missionNowEpoch - 31,
          }),
        },
        correctionClient: makeClient([subscriber([FAKE_PRIOR_GROUP])], requests),
      });
      expect(receipt.correction_result_status).toBe("blocked_pre_mutation_freshness_not_verified");
      expect(requests.map((request) => request.method)).toEqual(["GET"]);
      expect(receipt.mutation_endpoint_call_count).toBe(0);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("freshness expiring while the terminal lock is acquired blocks the POST with no retry", async () => {
    const { dir, roots, paths } = await makePaths();
    const requests: Array<Record<string, unknown>> = [];
    let clockCalls = 0;
    try {
      const receipt = await runMission(liveArgs(paths), {
        roots,
        credentialProvider: async () => ({ key: "mock" }),
        nowProvider: () => {
          clockCalls += 1;
          return clockCalls >= 6
            ? new Date(MISSION_NOW.getTime() + 31_000)
            : MISSION_NOW;
        },
        correctionClient: makeClient([subscriber([FAKE_PRIOR_GROUP])], requests),
      });
      expect(receipt.correction_result_status).toBe("blocked_post_lock_pre_post_freshness_not_verified_no_retry");
      expect(requests.map((request) => request.method)).toEqual(["GET"]);
      expect(receipt.mutation_endpoint_call_count).toBe(0);
      expect(clockCalls).toBeGreaterThanOrEqual(6);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("fresh automation recheck after mailbox baseline blocks drift before subscriber access", async () => {
    const { dir, roots, paths } = await makePaths();
    let automationCalls = 0;
    let subscriberCalls = 0;
    try {
      const receipt = await runMission(liveArgs(paths), {
        roots,
        credentialProvider: async () => ({ key: "mock" }),
        automationClient: {
          request: async () => {
            automationCalls += 1;
            return automationCalls === 1 ? automationDetail() : automationDetail({ enabled: false });
          },
        },
        correctionClient: { request: async () => { subscriberCalls += 1; return subscriber([FAKE_PRIOR_GROUP]); } },
      });
      expect(receipt.correction_result_status).toBe("blocked_fresh_automation_mapping_not_verified_after_mailbox_baseline");
      expect(automationCalls).toBe(2);
      expect(subscriberCalls).toBe(0);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("v2 permits exactly one additional pre-effect attempt and preserves the global mailbox lineage", async () => {
    const { dir, roots, paths } = await makePaths();
    let mailboxCalls = 0;
    let automationCalls = 0;
    try {
      const firstPaths = alternateOutputPaths(paths, roots, "v2-baseline-failure-1");
      const receipt = await runMission(liveArgs(firstPaths), {
        roots,
        credentialProvider: async () => ({ key: "mock" }),
        automationClient: { request: async () => { automationCalls += 1; return automationDetail(); } },
        mailboxEvidenceProvider: { search: async () => { mailboxCalls += 1; return { ok: false, has_more: false, ids_private: [] }; } },
        correctionClient: { request: async () => { throw new Error("subscriber_route_must_not_run"); } },
      });
      expect(receipt.correction_result_status).toBe("blocked_controlled_mailbox_baseline_not_verified");
      expect(receipt.pre_effect_live_attempt_count).toBe(4);
      expect(receipt.mailbox_evidence_check_count).toBe(4);

      const exhaustedPaths = alternateOutputPaths(paths, roots, "v2-baseline-failure-2");
      await expect(runMission(liveArgs(exhaustedPaths), {
        roots,
        credentialProvider: async () => ({ key: "mock" }),
        automationClient: { request: async () => { automationCalls += 1; return automationDetail(); } },
        mailboxEvidenceProvider: { search: async () => { mailboxCalls += 1; return { ok: false, has_more: false, ids_private: [] }; } },
      })).rejects.toThrow("blocked_pre_effect_live_attempt_budget_exhausted");
      expect(automationCalls).toBe(1);
      expect(mailboxCalls).toBe(1);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("the single v2 attempt receives only mailbox ordinals 4 through 8", async () => {
    const { dir, roots, paths } = await makePaths();
    let mailboxCalls = 0;
    const ordinals: number[] = [];
    try {
      const requests: Array<Record<string, unknown>> = [];
      const receipt = await runMission(liveArgs(paths), {
        roots,
        credentialProvider: async () => ({ key: "mock" }),
        mailboxEvidenceProvider: { search: async ({ budgetClaim }: { budgetClaim: { mailbox_check_ordinal: number } }) => {
          mailboxCalls += 1;
          ordinals.push(budgetClaim.mailbox_check_ordinal);
          return { ok: true, has_more: false, ids_private: [] };
        } },
        correctionClient: makeClient([subscriber([FAKE_PRIOR_GROUP]), subscriber([FAKE_PRIOR_GROUP, FAKE_ACTIVE_GROUP])], requests),
        sleep: async () => {},
      });
      expect(receipt.correction_result_status).toBe("correction_executed_verified");
      expect(receipt.pre_effect_live_attempt_count).toBe(4);
      expect(receipt.mailbox_evidence_check_count).toBe(8);
      expect(receipt.first_email_evidence_status).toBe("not_verified_evidence_budget_exhausted_no_resend");
      expect(mailboxCalls).toBe(5);
      expect(ordinals).toEqual([4, 5, 6, 7, 8]);
      expect(requests.filter((request) => request.method === "POST")).toHaveLength(1);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("preexisting exact first-email evidence blocks an absent-group assignment", async () => {
    const { dir, roots, paths } = await makePaths();
    const requests: Array<Record<string, unknown>> = [];
    try {
      const receipt = await runMission(liveArgs(paths), {
        roots,
        credentialProvider: async () => ({ key: "mock" }),
        mailboxEvidenceProvider: { search: async () => ({ ok: true, has_more: false, ids_private: [FAKE_MESSAGE_ID] }) },
        correctionClient: makeClient([subscriber([FAKE_PRIOR_GROUP])], requests),
      });
      expect(receipt.correction_result_status).toBe("blocked_preexisting_first_email_evidence_before_assignment");
      expect(receipt.first_email_evidence_status).toBe("preexisting_unique_bounded_locator_match_assignment_blocked");
      expect(requests.map((request) => request.method)).toEqual(["GET"]);
      expect(receipt.mutation_endpoint_call_count).toBe(0);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("preexisting-email terminal block consumes approval across changed run, packet, and outputs", async () => {
    const { dir, roots, paths } = await makePaths();
    let secondCredentialCalls = 0;
    try {
      const first = await runMission(liveArgs(paths), {
        roots,
        credentialProvider: async () => ({ key: "mock" }),
        mailboxEvidenceProvider: { search: async () => ({ ok: true, has_more: false, ids_private: [FAKE_MESSAGE_ID] }) },
        correctionClient: makeClient([subscriber([FAKE_PRIOR_GROUP])], []),
      });
      expect(first.correction_result_status).toBe("blocked_preexisting_first_email_evidence_before_assignment");
      const secondPacketId = "crm_core_mission_contract_2026_07_11_v1_after_email_block_packet_002";
      const secondRunId = "crm_core_mission_contract_2026_07_11_v1_after_email_block_run_002";
      const secondPaths = {
        approvalPhraseFile: paths.approvalPhraseFile,
        privatePacket: join(roots.privateMailerLiteRoot, "after-email-block-packet-002.json"),
        privateResultJson: join(roots.privateMailerLiteRoot, "after-email-block-result-002.json"),
        privateResultMd: join(roots.privateMailerLiteRoot, "after-email-block-result-002.md"),
        privateMailboxBridgeDir: join(roots.privateMailerLiteRoot, "after-email-block-bridge-002"),
        receiptJson: join(roots.redactedReceiptRoot, "after-email-block-receipt-002.json"),
        receiptMd: join(roots.redactedReceiptRoot, "after-email-block-receipt-002.md"),
      };
      await writeFile(secondPaths.privatePacket, `${JSON.stringify(missionPacket({
        packet_id: secondPacketId,
        mission_run_id: secondRunId,
      }), null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
      let secondArgs = replaceArgValue(liveArgs(secondPaths), "--expected-packet-id", secondPacketId);
      secondArgs = replaceArgValue(secondArgs, "--run-id", secondRunId);
      await expect(runMission(secondArgs, {
        roots,
        credentialProvider: async () => { secondCredentialCalls += 1; return { key: "mock" }; },
      })).rejects.toThrow("blocked_existing_output_or_attempt_state");
      expect(secondCredentialCalls).toBe(0);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("verified no-op can use one preexisting exact inbox match as first-email proof", async () => {
    const { dir, roots, paths } = await makePaths();
    try {
      const receipt = await runMission(liveArgs(paths), {
        roots,
        credentialProvider: async () => ({ key: "mock" }),
        mailboxEvidenceProvider: { search: async () => ({ ok: true, has_more: false, ids_private: [FAKE_MESSAGE_ID] }) },
        correctionClient: makeClient([
          subscriber([FAKE_PRIOR_GROUP, FAKE_ACTIVE_GROUP]),
          subscriber([FAKE_ACTIVE_GROUP, FAKE_PRIOR_GROUP]),
        ], []),
      });
      expect(receipt.correction_result_status).toBe("already_present_idempotent_noop_verified");
      expect(receipt.first_email_evidence_status).toBe("inbox_received_preexisting_unique_bounded_locator_match");
      expect(receipt.mailbox_evidence_check_count).toBe(4);
      expect(receipt.blockers).toEqual([]);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("missing delivery exhausts only the globally remaining checks and never resends or retriggers", async () => {
    const { dir, roots, paths } = await makePaths();
    const requests: Array<Record<string, unknown>> = [];
    const phases: string[] = [];
    try {
      const receipt = await runMission(liveArgs(paths), {
        roots,
        credentialProvider: async () => ({ key: "mock" }),
        mailboxEvidenceProvider: { search: async ({ phase }: { phase: string }) => { phases.push(phase); return { ok: true, has_more: false, ids_private: [] }; } },
        correctionClient: makeClient([subscriber([FAKE_PRIOR_GROUP]), subscriber([FAKE_PRIOR_GROUP, FAKE_ACTIVE_GROUP])], requests),
        sleep: async () => {},
      });
      expect(receipt.correction_result_status).toBe("correction_executed_verified");
      expect(receipt.first_email_evidence_status).toBe("not_verified_evidence_budget_exhausted_no_resend");
      expect(receipt.mailbox_evidence_check_count).toBe(8);
      expect(receipt.first_email_new_match_count).toBe(0);
      expect(phases.filter((phase) => phase === "baseline")).toHaveLength(1);
      expect(phases.filter((phase) => phase === "post_action")).toHaveLength(4);
      expect(requests.filter((request) => request.method === "POST")).toHaveLength(1);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("mission mapping failure stops before subscriber read or mutation", async () => {
    const { dir, roots, paths } = await makeMissionPaths();
    let correctionCalls = 0;
    try {
      const receipt = await runMission(missionArgs(paths), {
        roots,
        now: MISSION_NOW,
        executionContextProvider,
        credentialProvider: async () => ({ key: "mock" }),
        automationClient: { request: async () => automationDetail({ enabled: false }) },
        correctionClient: { request: async () => { correctionCalls += 1; return {}; } },
      });
      expect(receipt.correction_result_status).toBe("blocked_exact_automation_trigger_mapping_not_verified");
      expect(correctionCalls).toBe(0);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("mission binding rejects dirty worktree before credentials or network", async () => {
    const { dir, roots, paths } = await makeMissionPaths();
    let credentialCalls = 0;
    try {
      await expect(runMission(missionArgs(paths), {
        roots,
        now: MISSION_NOW,
        executionContextProvider: async () => ({ repo_head: EXPECTED_HEAD, worktree_clean: false, active_next_action: MISSION_ACTIVE_NEXT_ACTION }),
        credentialProvider: async () => { credentialCalls += 1; return { key: "mock" }; },
      })).rejects.toThrow("blocked_dirty_worktree");
      expect(credentialCalls).toBe(0);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("mission binding rejects head, action, packet, run, contract, and freshness mismatches before credentials", async () => {
    const cases: Array<{
      packetOverrides?: Record<string, unknown>;
      args?: (args: string[]) => string[];
      deps?: Record<string, unknown>;
      reason: string;
    }> = [
      {
        args: (args) => replaceArgValue(args, "--expected-repo-head", "b".repeat(40)),
        reason: "blocked_repo_head_mismatch",
      },
      {
        deps: { executionContextProvider: async () => ({ repo_head: EXPECTED_HEAD, worktree_clean: true, active_next_action: "crm_core_different_active_action_v0" }) },
        reason: "blocked_active_next_action_mismatch",
      },
      {
        args: (args) => replaceArgValue(args, "--expected-packet-id", "crm_core_different_execution_packet"),
        reason: "blocked_packet_id_mismatch",
      },
      {
        args: (args) => replaceArgValue(args, "--run-id", "crm_core_mission_contract_2026_07_11_v1_run_002"),
        reason: "blocked_mission_packet_run_id_mismatch",
      },
      {
        packetOverrides: { mission_contract_version: "Mission Contract 2026-07-11.v0" },
        reason: "blocked_mission_packet_contract_version_mismatch",
      },
      {
        packetOverrides: { lineage_identity_binding_status: "not_verified" },
        reason: "blocked_mission_packet_identity_lineage_not_verified",
      },
      {
        packetOverrides: { mission_created_at: "2026-07-11T18:30:00.000Z" },
        reason: "blocked_mission_packet_stale_or_invalid",
      },
      {
        packetOverrides: { mission_created_at: "2026-07-11T15:00:00.000Z" },
        reason: "blocked_mission_packet_stale_or_invalid",
      },
    ];
    for (const item of cases) {
      const { dir, roots, paths } = await makePaths(item.packetOverrides ?? {});
      let credentialCalls = 0;
      try {
        const args = item.args ? item.args(liveArgs(paths)) : liveArgs(paths);
        await expect(runMission(args, {
          roots,
          ...(item.deps ?? {}),
          credentialProvider: async () => { credentialCalls += 1; return { key: "mock" }; },
        })).rejects.toThrow(item.reason);
        expect(credentialCalls).toBe(0);
      } finally { await rm(dir, { recursive: true, force: true }); }
    }
  });

  test("subscriber identity must match the packet anchor before POST", async () => {
    const { dir, roots, paths } = await makePaths();
    const requests: Array<Record<string, unknown>> = [];
    try {
      const receipt = await runMission(liveArgs(paths), {
        roots,
        credentialProvider: async () => ({ key: "mock" }),
        correctionClient: makeClient([subscriber([FAKE_PRIOR_GROUP], "active", "different@example.test")], requests),
      });
      expect(receipt.correction_result_status).toBe("blocked_subscriber_identity_mismatch_or_unknown");
      expect(requests.map((request) => request.method)).toEqual(["GET"]);
      expect(receipt.mutation_endpoint_call_count).toBe(0);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("post-read identity must remain the same subscriber", async () => {
    const { dir, roots, paths } = await makePaths();
    try {
      const receipt = await runMission(liveArgs(paths), {
        roots,
        credentialProvider: async () => ({ key: "mock" }),
        correctionClient: makeClient([
          subscriber([FAKE_PRIOR_GROUP]),
          subscriber([FAKE_PRIOR_GROUP, FAKE_ACTIVE_GROUP], "active", FAKE_GMAIL_PLUS, "sub_different_after_002"),
        ], []),
      });
      expect(receipt.correction_result_status).toBe("blocked_post_correction_verification_failed_no_retry");
      expect(receipt.identity_verification_status).toBe("failed_subscriber_changed_or_unknown");
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("missing or duplicate complete-group snapshot blocks before POST", async () => {
    const cases = [
      { subscriber: { id: FAKE_SUBSCRIBER_ID, email: FAKE_GMAIL_PLUS, status: "active" } },
      { subscriber: { id: FAKE_SUBSCRIBER_ID, email: FAKE_GMAIL_PLUS, status: "active", groups: [{ id: FAKE_PRIOR_GROUP }, { id: FAKE_PRIOR_GROUP }] } },
    ];
    for (const response of cases) {
      const { dir, roots, paths } = await makePaths();
      const requests: Array<Record<string, unknown>> = [];
      try {
        const receipt = await runMission(liveArgs(paths), {
          roots,
          credentialProvider: async () => ({ key: "mock" }),
          correctionClient: makeClient([response], requests),
        });
        expect(receipt.correction_result_status).toBe("blocked_active_trigger_membership_unknown");
        expect(receipt.mutation_endpoint_call_count).toBe(0);
        expect(requests.map((request) => request.method)).toEqual(["GET"]);
      } finally { await rm(dir, { recursive: true, force: true }); }
    }
  });

  test("complete group transition blocks a dropped prior group or an unrelated addition", async () => {
    for (const afterGroups of [
      [FAKE_PRIOR_GROUP, FAKE_ACTIVE_GROUP],
      [FAKE_PRIOR_GROUP, FAKE_OTHER_GROUP, FAKE_ACTIVE_GROUP, "grp_unrelated_new_004"],
    ]) {
      const { dir, roots, paths } = await makePaths();
      try {
        const receipt = await runMission(liveArgs(paths), {
          roots,
          credentialProvider: async () => ({ key: "mock" }),
          correctionClient: makeClient([
            subscriber([FAKE_PRIOR_GROUP, FAKE_OTHER_GROUP]),
            subscriber(afterGroups),
          ], []),
        });
        expect(receipt.correction_result_status).toBe("blocked_post_correction_verification_failed_no_retry");
        expect(receipt.all_prior_groups_preservation_status).toBe(afterGroups.includes(FAKE_OTHER_GROUP) ? "all_preserved" : "failed_or_unknown");
      } finally { await rm(dir, { recursive: true, force: true }); }
    }
  });

  test("no-op immediate reread blocks group drift", async () => {
    const { dir, roots, paths } = await makePaths();
    try {
      const receipt = await runMission(liveArgs(paths), {
        roots,
        credentialProvider: async () => ({ key: "mock" }),
        correctionClient: makeClient([
          subscriber([FAKE_PRIOR_GROUP, FAKE_ACTIVE_GROUP]),
          subscriber([FAKE_PRIOR_GROUP, FAKE_ACTIVE_GROUP, FAKE_OTHER_GROUP]),
        ], []),
      });
      expect(receipt.correction_result_status).toBe("blocked_noop_immediate_verification_failed");
      expect(receipt.group_transition_status).toBe("failed_noop_group_drift");
      expect(receipt.mutation_endpoint_call_count).toBe(0);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("unknown POST outcome is never retried and one readback can verify the effect", async () => {
    const { dir, roots, paths } = await makePaths();
    const requests: Array<Record<string, unknown>> = [];
    let getCount = 0;
    try {
      const receipt = await runMission(liveArgs(paths), {
        roots,
        credentialProvider: async () => ({ key: "mock" }),
        correctionClient: {
          request: async (request: Record<string, unknown>) => {
            requests.push(request);
            if (request.method === "POST") throw new Error("simulated_timeout");
            getCount += 1;
            return getCount === 1 ? subscriber([FAKE_PRIOR_GROUP]) : subscriber([FAKE_PRIOR_GROUP, FAKE_ACTIVE_GROUP]);
          },
        },
      });
      expect(receipt.correction_result_status).toBe("assignment_effect_verified_after_unknown_post_outcome");
      expect(receipt.correction_executed).toBeNull();
      expect(receipt.mutation_endpoint_call_count).toBe(1);
      expect(requests.filter((request) => request.method === "POST")).toHaveLength(1);
      expect(requests.map((request) => request.method)).toEqual(["GET", "POST", "GET"]);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("unknown POST outcome without verified effect stops permanently after one readback", async () => {
    const { dir, roots, paths } = await makePaths();
    const requests: Array<Record<string, unknown>> = [];
    let getCount = 0;
    try {
      const receipt = await runMission(liveArgs(paths), {
        roots,
        credentialProvider: async () => ({ key: "mock" }),
        correctionClient: {
          request: async (request: Record<string, unknown>) => {
            requests.push(request);
            if (request.method === "POST") throw new Error("simulated_timeout");
            getCount += 1;
            return subscriber([FAKE_PRIOR_GROUP]);
          },
        },
      });
      expect(receipt.correction_result_status).toBe("blocked_assignment_outcome_unknown_no_retry");
      expect(receipt.correction_executed).toBeNull();
      expect(requests.filter((request) => request.method === "POST")).toHaveLength(1);
      expect(requests.map((request) => request.method)).toEqual(["GET", "POST", "GET"]);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("existing output or mutation-attempt state blocks replay before credentials", async () => {
    const { dir, roots, paths } = await makePaths();
    let credentialCalls = 0;
    try {
      await runMission(liveArgs(paths), {
        roots,
        credentialProvider: async () => ({ key: "mock" }),
        correctionClient: makeClient([subscriber([FAKE_PRIOR_GROUP]), subscriber([FAKE_PRIOR_GROUP, FAKE_ACTIVE_GROUP])], []),
      });
      await expect(runMission(liveArgs(paths), {
        roots,
        credentialProvider: async () => { credentialCalls += 1; return { key: "mock" }; },
      })).rejects.toThrow("blocked_existing_output_or_attempt_state");
      expect(credentialCalls).toBe(0);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("one-use mission approval blocks a second packet, run, and output set before credentials", async () => {
    const { dir, roots, paths } = await makePaths();
    let secondCredentialCalls = 0;
    try {
      await runMission(liveArgs(paths), {
        roots,
        credentialProvider: async () => ({ key: "mock" }),
        correctionClient: makeClient([subscriber([FAKE_PRIOR_GROUP]), subscriber([FAKE_PRIOR_GROUP, FAKE_ACTIVE_GROUP])], []),
      });
      const secondPacketId = "crm_core_mission_contract_2026_07_11_v1_execution_packet_002";
      const secondRunId = "crm_core_mission_contract_2026_07_11_v1_run_002";
      const secondPaths = {
        approvalPhraseFile: paths.approvalPhraseFile,
        privatePacket: join(roots.privateMailerLiteRoot, "correction-packet-002.json"),
        privateResultJson: join(roots.privateMailerLiteRoot, "correction-result-002.json"),
        privateResultMd: join(roots.privateMailerLiteRoot, "correction-result-002.md"),
        privateMailboxBridgeDir: join(roots.privateMailerLiteRoot, "correction-bridge-002"),
        receiptJson: join(roots.redactedReceiptRoot, "correction-receipt-002.json"),
        receiptMd: join(roots.redactedReceiptRoot, "correction-receipt-002.md"),
      };
      await writeFile(secondPaths.privatePacket, `${JSON.stringify(missionPacket({
        packet_id: secondPacketId,
        mission_run_id: secondRunId,
      }), null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
      let secondArgs = replaceArgValue(liveArgs(secondPaths), "--expected-packet-id", secondPacketId);
      secondArgs = replaceArgValue(secondArgs, "--run-id", secondRunId);
      await expect(runMission(secondArgs, {
        roots,
        credentialProvider: async () => { secondCredentialCalls += 1; return { key: "mock" }; },
      })).rejects.toThrow("blocked_existing_output_or_attempt_state");
      expect(secondCredentialCalls).toBe(0);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("verified no-op also consumes the one-use mission approval", async () => {
    const { dir, roots, paths } = await makePaths();
    let secondCredentialCalls = 0;
    try {
      const first = await runMission(liveArgs(paths), {
        roots,
        credentialProvider: async () => ({ key: "mock" }),
        correctionClient: makeClient([
          subscriber([FAKE_PRIOR_GROUP, FAKE_ACTIVE_GROUP]),
          subscriber([FAKE_ACTIVE_GROUP, FAKE_PRIOR_GROUP]),
        ], []),
      });
      expect(first.correction_result_status).toBe("already_present_idempotent_noop_verified");
      const secondPacketId = "crm_core_mission_contract_2026_07_11_v1_after_noop_packet_002";
      const secondRunId = "crm_core_mission_contract_2026_07_11_v1_after_noop_run_002";
      const secondPaths = {
        approvalPhraseFile: paths.approvalPhraseFile,
        privatePacket: join(roots.privateMailerLiteRoot, "after-noop-packet-002.json"),
        privateResultJson: join(roots.privateMailerLiteRoot, "after-noop-result-002.json"),
        privateResultMd: join(roots.privateMailerLiteRoot, "after-noop-result-002.md"),
        privateMailboxBridgeDir: join(roots.privateMailerLiteRoot, "after-noop-bridge-002"),
        receiptJson: join(roots.redactedReceiptRoot, "after-noop-receipt-002.json"),
        receiptMd: join(roots.redactedReceiptRoot, "after-noop-receipt-002.md"),
      };
      await writeFile(secondPaths.privatePacket, `${JSON.stringify(missionPacket({
        packet_id: secondPacketId,
        mission_run_id: secondRunId,
      }), null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
      let secondArgs = replaceArgValue(liveArgs(secondPaths), "--expected-packet-id", secondPacketId);
      secondArgs = replaceArgValue(secondArgs, "--run-id", secondRunId);
      await expect(runMission(secondArgs, {
        roots,
        credentialProvider: async () => { secondCredentialCalls += 1; return { key: "mock" }; },
      })).rejects.toThrow("blocked_existing_output_or_attempt_state");
      expect(secondCredentialCalls).toBe(0);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("unapproved API bases block before credential access", async () => {
    const { dir, roots, paths } = await makePaths();
    let credentialCalls = 0;
    try {
      for (const apiBase of [
        "http://connect.mailerlite.com/api",
        "https://connect.mailerlite.com.evil.test/api",
        "https://user@connect.mailerlite.com/api",
        "https://connect.mailerlite.com/other",
        "https://connect.mailerlite.com/api?redirect=evil",
      ]) {
        await expect(runMission([...liveArgs(paths), "--api-base", apiBase], {
          roots,
          credentialProvider: async () => { credentialCalls += 1; return { key: "mock" }; },
        })).rejects.toThrow("blocked_unapproved_mailerlite_api_base");
      }
      expect(credentialCalls).toBe(0);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("request timeout is bounded before credentials", async () => {
    const { dir, roots, paths } = await makePaths();
    let credentialCalls = 0;
    try {
      for (const timeout of ["999", "30001"]) {
        await expect(runMission([...liveArgs(paths), "--timeout-ms", timeout], {
          roots,
          credentialProvider: async () => { credentialCalls += 1; return { key: "mock" }; },
        })).rejects.toThrow("blocked_timeout_out_of_bounds");
      }
      expect(credentialCalls).toBe(0);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("direct client never invokes fetch for an unapproved host", async () => {
    let fetchCalls = 0;
    const client = createMailerLiteActiveTriggerCorrectionClient({
      options: { apiBase: "https://connect.mailerlite.com.evil.test/api", timeoutMs: 1_000 },
      key: "mock",
      fetchImpl: async () => { fetchCalls += 1; return new Response("{}"); },
    });
    await expect(client.request({ method: "GET", path: subscriberGetPath(FAKE_EMAIL) })).rejects.toThrow("blocked_unapproved_mailerlite_api_base");
    expect(fetchCalls).toBe(0);
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
    expect(() => assertAllowedCorrectionRequest({ method: "GET", path: `/api/subscribers/${FAKE_EMAIL}` })).toThrow("blocked_endpoint_not_allowlisted");
    expect(assertAllowedCorrectionRequest({ method: "GET", path: subscriberGetPath(FAKE_EMAIL) })).toBe(true);
    expect(assertAllowedCorrectionRequest({ method: "POST", path: `/api/subscribers/${FAKE_SUBSCRIBER_ID}/groups/${FAKE_ACTIVE_GROUP}` })).toBe(true);
  });

  test("CLI parse blockers never echo accidental argument values", () => {
    const privateAccidentalValue = "private-person@example.test";
    for (const args of [["--email", privateAccidentalValue], ["--unexpected", privateAccidentalValue]]) {
      try {
        parseArgs(args);
        throw new Error("expected_parse_block");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        expect(message).not.toContain(privateAccidentalValue);
        expect(["forbidden_cli_argument", "unknown_cli_argument"]).toContain(message);
      }
    }
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
      await expect(runMission(liveArgs(paths), {
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
      const receipt = await runMission(liveArgs(paths), {
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
      await runMission(liveArgs(paths), {
        roots,
        credentialProvider: async () => ({ key: "mock" }),
        correctionClient: makeClient([subscriber([FAKE_PRIOR_GROUP]), subscriber([FAKE_PRIOR_GROUP, FAKE_ACTIVE_GROUP])], []),
      });
      expect(paths.privateResultJson).toContain(tmpdir());
      expect(paths.privateResultMd).toContain(tmpdir());
      expect(paths.receiptJson).toContain(tmpdir());
      expect(paths.receiptMd).toContain(tmpdir());
      expect((await stat(paths.privateResultJson)).mode & 0o777).toBe(0o600);
      expect((await stat(paths.privateResultMd)).mode & 0o777).toBe(0o600);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test("package.json remains valid and package-lock is unchanged", async () => {
    const pkg = JSON.parse(await readFile(join(process.cwd(), "package.json"), "utf8"));
    expect(pkg.scripts[EXPECTED_SCRIPT]).toBe("node scripts/crm-vnext-mailerlite-existing-subscriber-active-trigger-correction.mjs");
    expect(pkg.scripts["crm:vnext:controlled-mailbox-file-bridge-publisher"])
      .toBe("node scripts/crm-vnext-controlled-mailbox-file-bridge-publisher.mjs");
    const { stdout } = await execFileAsync("git", ["diff", "--name-only", "--", "package-lock.json"], { cwd: process.cwd() });
    expect(stdout.trim()).toBe("");
  });
});
