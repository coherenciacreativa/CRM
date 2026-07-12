import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { chmod, link, mkdir, mkdtemp, readFile, realpath, rename, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, test, vi } from "vitest";

import {
  MISSION_CONTRACT_APPROVAL_CONTRACT_VERSION,
  controlledInboxQuery,
  createFileBridgeMailboxEvidenceProvider,
} from "../scripts/crm-vnext-mailerlite-existing-subscriber-active-trigger-correction.mjs";
import {
  claimFileBridgeConsumption,
  orchestrateOneShotMailboxBridge,
  prepareFileBridgePublisher,
  publishFileBridgeResult,
  runPublisherSession,
} from "../scripts/crm-vnext-controlled-mailbox-file-bridge-publisher.mjs";

const SYNTHETIC_PLUS = "operator.fixture+controlled-proof@gmail.com";
const SYNTHETIC_BASE = "operator.fixture@gmail.com";
const SYNTHETIC_SENDER = "onboarding.fixture@example.test";
const SYNTHETIC_SUBJECT = "Synthetic controlled onboarding proof";
const SYNTHETIC_RAW_ID = "18f_fixture_message_id_001";
const SYNTHETIC_RAW_ID_2 = "18f_fixture_message_id_002";
const privateFixtureValues = [
  SYNTHETIC_PLUS,
  SYNTHETIC_BASE,
  SYNTHETIC_SENDER,
  SYNTHETIC_SUBJECT,
  SYNTHETIC_RAW_ID,
  SYNTHETIC_RAW_ID_2,
];

const rootsToRemove: string[] = [];

afterEach(async () => {
  await Promise.all(rootsToRemove.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

const digest = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");

const makeFixture = async ({
  contractVersion = MISSION_CONTRACT_APPROVAL_CONTRACT_VERSION,
  ordinal = 4,
  requestOverrides = {},
}: {
  contractVersion?: string;
  ordinal?: number;
  requestOverrides?: Record<string, unknown>;
} = {}) => {
  const privateRoot = await realpath(await mkdtemp(join(tmpdir(), "crm-core-publisher-private-")));
  rootsToRemove.push(privateRoot);
  const bridgeDir = join(privateRoot, "bridge");
  await mkdir(bridgeDir, { mode: 0o700 });
  const nowEpochSeconds = Math.floor(Date.now() / 1000);
  const locator = { sender_private: SYNTHETIC_SENDER, subject_private: SYNTHETIC_SUBJECT };
  const requestWithoutDigest = {
    schema_version: "crm-core-controlled-mailbox-file-bridge-v1",
    request_id: "01-baseline",
    request_nonce_private: "a".repeat(64),
    requested_at_epoch_seconds: nowEpochSeconds,
    mission_binding_private: {
      approval_contract_version: contractVersion,
      run_id: "synthetic_mission_run_001",
      packet_id: "synthetic_packet_001",
      mailbox_check_ordinal: ordinal,
    },
    worker_contract: "one_shot_request_id_no_reprocessing",
    digest_contract: {
      request_digest: "sha256_lowercase_hex_of_utf8_json_stringify_request_without_request_digest_private",
      response_digest: "sha256_lowercase_hex_of_exact_response_file_bytes",
      message_id_digest: "sha256_lowercase_hex_of_utf8_raw_gmail_message_id",
    },
    connector_operation: "gmail_search_email_ids",
    phase: "baseline",
    label_ids: ["INBOX"],
    max_results: 2,
    mailbox_anchor_private: SYNTHETIC_PLUS,
    locator_private: { sender: SYNTHETIC_SENDER, subject: SYNTHETIC_SUBJECT },
    query_private: controlledInboxQuery({
      mailboxAnchor: SYNTHETIC_PLUS,
      locator,
      afterEpochSeconds: nowEpochSeconds - 60,
      beforeEpochSeconds: nowEpochSeconds + 60,
    }),
    ...requestOverrides,
  };
  const request = {
    ...requestWithoutDigest,
    request_digest_private: digest(JSON.stringify(requestWithoutDigest)),
  };
  const requestPath = join(bridgeDir, "01-baseline.request.json");
  await writeFile(requestPath, `${JSON.stringify(request, null, 2)}\n`, { mode: 0o600, flag: "wx" });
  return { bridgeDir, nowEpochSeconds, privateRoot, request, requestPath };
};

const publishCommand = (fixture: Awaited<ReturnType<typeof makeFixture>>, overrides: Record<string, unknown> = {}) => ({
  command: "publish_result",
  connector_operation: "gmail_search_email_ids",
  executed_query_private: fixture.request.query_private,
  profile_email_private: SYNTHETIC_BASE,
  raw_ids_private: [SYNTHETIC_RAW_ID],
  has_more: false,
  search_executed_at_epoch_seconds: fixture.nowEpochSeconds,
  ...overrides,
});

const fakeTerminal = (lines: string[]) => {
  const events: Array<Record<string, unknown>> = [];
  const rawModes: boolean[] = [];
  let index = 0;
  let closed = false;
  return {
    events,
    rawModes,
    terminal: {
      isTTY: true,
      setRawMode: (enabled: boolean) => rawModes.push(enabled),
      iterator: {
        next: async () => (index < lines.length ? { value: lines[index++], done: false } : { value: undefined, done: true }),
      },
      writeEvent: (event: Record<string, unknown>) => events.push(event),
      close: () => { closed = true; },
    },
    isClosed: () => closed,
  };
};

describe("controlled mailbox file-bridge publisher", () => {
  test("requires a real TTY before creating a consumption marker", async () => {
    const fixture = await makeFixture();
    const terminal = fakeTerminal([]);
    terminal.terminal.isTTY = false;
    await expect(runPublisherSession({
      requestPath: fixture.requestPath,
      privateRoot: fixture.privateRoot,
      terminal: terminal.terminal,
    })).rejects.toThrow("blocked_publisher_interactive_tty_required");
    await expect(stat(join(fixture.bridgeDir, "01-baseline.consumed.json"))).rejects.toMatchObject({ code: "ENOENT" });
    await expect(stat(join(fixture.bridgeDir, "01-baseline.response.json"))).rejects.toMatchObject({ code: "ENOENT" });
    await expect(stat(join(fixture.bridgeDir, "01-baseline.ready.json"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  test("the non-TTY CLI exits safely without echoing private values or creating outputs", async () => {
    const fixture = await makeFixture();
    const script = resolve(process.cwd(), "scripts/crm-vnext-controlled-mailbox-file-bridge-publisher.mjs");
    const result = spawnSync(process.execPath, [script, "--private-mailbox-request-json", fixture.requestPath], {
      encoding: "utf8",
      input: "",
      timeout: 10_000,
    });
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("blocked_publisher_interactive_tty_required");
    for (const value of privateFixtureValues) {
      expect(result.stdout).not.toContain(value);
      expect(result.stderr).not.toContain(value);
    }
    await expect(stat(join(fixture.bridgeDir, "01-baseline.consumed.json"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  test("performs a complete echo-disabled synthetic handshake and publishes only hashes", async () => {
    const fixture = await makeFixture();
    const terminal = fakeTerminal([
      JSON.stringify({ command: "claim_consumption" }),
      JSON.stringify(publishCommand(fixture)),
    ]);
    const result = await runPublisherSession({
      requestPath: fixture.requestPath,
      privateRoot: fixture.privateRoot,
      terminal: terminal.terminal,
    });
    expect(result).toEqual({ ok: true, status: "response_ready", id_count: 1 });
    expect(terminal.rawModes).toEqual([true, false]);
    expect(terminal.isClosed()).toBe(true);
    expect(terminal.events.map((event) => event.status)).toEqual([
      "waiting_for_consumption_claim",
      "consumption_claimed",
      "response_ready",
    ]);
    const safeOutput = JSON.stringify(terminal.events);
    for (const value of privateFixtureValues) expect(safeOutput).not.toContain(value);

    const consumptionPath = join(fixture.bridgeDir, "01-baseline.consumed.json");
    const responsePath = join(fixture.bridgeDir, "01-baseline.response.json");
    const readyPath = join(fixture.bridgeDir, "01-baseline.ready.json");
    const [responseBytes, ready] = await Promise.all([
      readFile(responsePath),
      readFile(readyPath, "utf8").then(JSON.parse),
    ]);
    const response = JSON.parse(responseBytes.toString("utf8"));
    expect(response.id_digests_private).toEqual([digest(SYNTHETIC_RAW_ID)]);
    expect(responseBytes.toString("utf8")).not.toContain(SYNTHETIC_RAW_ID);
    expect(ready.response_digest_private).toBe(digest(responseBytes));
    for (const path of [consumptionPath, responsePath, readyPath]) {
      expect((await stat(path)).mode & 0o777).toBe(0o600);
    }
    const [requestMetadata, consumptionMetadata, responseMetadata, readyMetadata] = await Promise.all([
      stat(fixture.requestPath),
      stat(consumptionPath),
      stat(responsePath),
      stat(readyPath),
    ]);
    expect(consumptionMetadata.mtimeMs).toBeGreaterThan(requestMetadata.mtimeMs);
    expect(responseMetadata.mtimeMs).toBeGreaterThan(consumptionMetadata.mtimeMs);
    expect(readyMetadata.mtimeMs).toBeGreaterThanOrEqual(responseMetadata.mtimeMs);
  });

  test("is compatible end-to-end with the existing guard without test-side timing sleeps", async () => {
    const privateRoot = await realpath(await mkdtemp(join(tmpdir(), "crm-core-publisher-guard-")));
    rootsToRemove.push(privateRoot);
    const bridgeDir = join(privateRoot, "bridge");
    const nowEpochSeconds = Math.floor(Date.now() / 1000);
    let published = false;
    const provider = createFileBridgeMailboxEvidenceProvider({
      bridgeDir,
      privateRoot,
      nonceProvider: () => "b".repeat(64),
      sleep: async () => {
        if (published) return;
        published = true;
        const requestPath = join(bridgeDir, "01-baseline.request.json");
        const context = await prepareFileBridgePublisher({ requestPath, privateRoot });
        const claimed = await claimFileBridgeConsumption({ context });
        await publishFileBridgeResult({
          context,
          claimed,
          command: {
            command: "publish_result",
            connector_operation: "gmail_search_email_ids",
            executed_query_private: context.request.query_private,
            profile_email_private: SYNTHETIC_BASE,
            raw_ids_private: [SYNTHETIC_RAW_ID],
            has_more: false,
            search_executed_at_epoch_seconds: nowEpochSeconds,
          },
        });
      },
    });
    const result = await provider.search({
      phase: "baseline",
      mailboxAnchor: SYNTHETIC_PLUS,
      locator: { ok: true, sender_private: SYNTHETIC_SENDER, subject_private: SYNTHETIC_SUBJECT },
      afterEpochSeconds: nowEpochSeconds - 60,
      beforeEpochSeconds: nowEpochSeconds + 60,
      budgetClaim: {
        approval_contract_version: MISSION_CONTRACT_APPROVAL_CONTRACT_VERSION,
        run_id: "synthetic_mission_run_guard_001",
        packet_id: "synthetic_packet_guard_001",
        mailbox_check_ordinal: 4,
      },
    });
    expect(result).toEqual({
      ok: true,
      ids_private: [digest(SYNTHETIC_RAW_ID)],
      has_more: false,
      source_checked_at_epoch_seconds: nowEpochSeconds,
    });
  });

  test("a missing publisher session guarantees zero claim, connector calls, and publication", async () => {
    const claim = vi.fn();
    const connector = vi.fn();
    const publish = vi.fn();
    const result = await orchestrateOneShotMailboxBridge({
      startPublisher: async () => null,
      claimConsumption: claim,
      connectorSearch: connector,
      publishResult: publish,
    });
    expect(result).toEqual({
      ok: false,
      status: "blocked_publisher_not_waiting",
      claim_count: 0,
      connector_call_count: 0,
      publication_count: 0,
    });
    expect(claim).not.toHaveBeenCalled();
    expect(connector).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
  });

  test("a missing or negative durable-claim acknowledgment guarantees zero connector calls", async () => {
    for (const acknowledgment of [undefined, { claimed: false }]) {
      const connector = vi.fn();
      const publish = vi.fn();
      const result = await orchestrateOneShotMailboxBridge({
        startPublisher: async () => ({ waiting: true, session: { id: "synthetic-session" } }),
        claimConsumption: async () => acknowledgment,
        connectorSearch: connector,
        publishResult: publish,
      });
      expect(result).toEqual({
        ok: false,
        status: "blocked_consumption_claim_not_confirmed",
        claim_count: 0,
        connector_call_count: 0,
        publication_count: 0,
      });
      expect(connector).not.toHaveBeenCalled();
      expect(publish).not.toHaveBeenCalled();
    }
  });

  test("the controller enforces waiting, claim, one connector call, then one publication", async () => {
    const order: string[] = [];
    const session = { id: "synthetic-session" };
    const result = await orchestrateOneShotMailboxBridge({
      startPublisher: async () => { order.push("waiting"); return { waiting: true, session }; },
      claimConsumption: async () => { order.push("claim"); return { claimed: true }; },
      connectorSearch: async () => { order.push("connector"); return { synthetic: true }; },
      publishResult: async () => { order.push("publish"); },
    });
    expect(order).toEqual(["waiting", "claim", "connector", "publish"]);
    expect(result).toMatchObject({ ok: true, claim_count: 1, connector_call_count: 1, publication_count: 1 });
  });

  test("EOF after a durable claim preserves the marker and never creates response or ready", async () => {
    const fixture = await makeFixture();
    const terminal = fakeTerminal([JSON.stringify({ command: "claim_consumption" })]);
    await expect(runPublisherSession({
      requestPath: fixture.requestPath,
      privateRoot: fixture.privateRoot,
      terminal: terminal.terminal,
    })).rejects.toThrow("blocked_publisher_result_timeout_or_eof");
    expect((await stat(join(fixture.bridgeDir, "01-baseline.consumed.json"))).mode & 0o777).toBe(0o600);
    await expect(stat(join(fixture.bridgeDir, "01-baseline.response.json"))).rejects.toMatchObject({ code: "ENOENT" });
    await expect(stat(join(fixture.bridgeDir, "01-baseline.ready.json"))).rejects.toMatchObject({ code: "ENOENT" });
    expect(terminal.rawModes).toEqual([true, false]);
  });

  test("duplicate claims and preexisting outputs are fail-closed", async () => {
    const fixture = await makeFixture();
    const context = await prepareFileBridgePublisher({ requestPath: fixture.requestPath, privateRoot: fixture.privateRoot });
    await claimFileBridgeConsumption({ context });
    await expect(claimFileBridgeConsumption({ context })).rejects.toThrow("blocked_publisher_output_already_exists");
    await expect(prepareFileBridgePublisher({ requestPath: fixture.requestPath, privateRoot: fixture.privateRoot }))
      .rejects.toThrow("blocked_publisher_output_already_exists");
  });

  test("publisher accepts the current v2 mission only by exact request binding", async () => {
    const fixture = await makeFixture({ contractVersion: "Mission Contract 2026-07-11.v2", ordinal: 4 });
    const context = await prepareFileBridgePublisher({ requestPath: fixture.requestPath, privateRoot: fixture.privateRoot });
    expect(context.request.mission_binding_private).toMatchObject({
      approval_contract_version: "Mission Contract 2026-07-11.v2",
      mailbox_check_ordinal: 4,
    });
  });

  test("publisher refuses an old v1 request even when its request digest is otherwise valid", async () => {
    const fixture = await makeFixture({ contractVersion: "Mission Contract 2026-07-11.v1", ordinal: 4 });
    await expect(prepareFileBridgePublisher({ requestPath: fixture.requestPath, privateRoot: fixture.privateRoot }))
      .rejects.toThrow("blocked_publisher_mission_binding_invalid");
  });

  test("publisher refuses current-v2 mailbox ordinals that would reset the v1 lineage", async () => {
    const fixture = await makeFixture({ contractVersion: "Mission Contract 2026-07-11.v2", ordinal: 3 });
    await expect(prepareFileBridgePublisher({ requestPath: fixture.requestPath, privateRoot: fixture.privateRoot }))
      .rejects.toThrow("blocked_publisher_mission_binding_invalid");
  });

  test("tampered requests, unsafe modes, and hard-linked requests are rejected", async () => {
    const tampered = await makeFixture({ requestOverrides: { max_results: 3 } });
    await expect(prepareFileBridgePublisher({ requestPath: tampered.requestPath, privateRoot: tampered.privateRoot }))
      .rejects.toThrow("blocked_publisher_search_bounds_invalid");

    const wrongMode = await makeFixture();
    await chmod(wrongMode.requestPath, 0o644);
    await expect(prepareFileBridgePublisher({ requestPath: wrongMode.requestPath, privateRoot: wrongMode.privateRoot }))
      .rejects.toThrow("blocked_publisher_request_permissions_or_stability");

    const hardLinked = await makeFixture();
    await link(hardLinked.requestPath, join(hardLinked.bridgeDir, "request-hard-link.json"));
    await expect(prepareFileBridgePublisher({ requestPath: hardLinked.requestPath, privateRoot: hardLinked.privateRoot }))
      .rejects.toThrow("blocked_publisher_request_permissions_or_stability");
  });

  test("unsafe private-root permissions and a replaced pinned bridge directory are rejected before claim", async () => {
    const unsafeRoot = await makeFixture();
    await chmod(unsafeRoot.privateRoot, 0o777);
    await expect(prepareFileBridgePublisher({ requestPath: unsafeRoot.requestPath, privateRoot: unsafeRoot.privateRoot }))
      .rejects.toThrow("blocked_publisher_bridge_directory_invalid");

    const replaced = await makeFixture();
    const context = await prepareFileBridgePublisher({ requestPath: replaced.requestPath, privateRoot: replaced.privateRoot });
    const originalBridge = join(replaced.privateRoot, "bridge-original");
    await rename(replaced.bridgeDir, originalBridge);
    await mkdir(replaced.bridgeDir, { mode: 0o700 });
    await expect(claimFileBridgeConsumption({ context })).rejects.toThrow("blocked_publisher_bridge_directory_invalid");
    await expect(stat(join(replaced.bridgeDir, "01-baseline.consumed.json"))).rejects.toMatchObject({ code: "ENOENT" });
    await expect(stat(join(originalBridge, "01-baseline.consumed.json"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  test("publish is blocked before claim and malformed private results never create ready", async () => {
    const beforeClaim = await makeFixture();
    const contextBeforeClaim = await prepareFileBridgePublisher({ requestPath: beforeClaim.requestPath, privateRoot: beforeClaim.privateRoot });
    await expect(publishFileBridgeResult({
      context: contextBeforeClaim,
      claimed: null,
      command: publishCommand(beforeClaim),
    })).rejects.toThrow("blocked_publisher_consumption_missing");

    const cases = [
      { profile_email_private: SYNTHETIC_PLUS },
      { profile_email_private: "operatorfixture@gmail.com" },
      { profile_email_private: "operator.fixture@googlemail.com" },
      { has_more: true },
      { raw_ids_private: [SYNTHETIC_RAW_ID, SYNTHETIC_RAW_ID, SYNTHETIC_RAW_ID] },
      { raw_ids_private: [SYNTHETIC_RAW_ID, SYNTHETIC_RAW_ID] },
      { raw_ids_private: ["body text is forbidden"] },
      { executed_query_private: "in:inbox" },
      { search_executed_at_epoch_seconds: 1 },
      { forbidden_extra: "not-allowed" },
    ];
    for (const overrides of cases) {
      const fixture = await makeFixture();
      const context = await prepareFileBridgePublisher({ requestPath: fixture.requestPath, privateRoot: fixture.privateRoot });
      const claimed = await claimFileBridgeConsumption({ context });
      await expect(publishFileBridgeResult({
        context,
        claimed,
        command: publishCommand(fixture, overrides),
      })).rejects.toThrow(/^blocked_publisher_/);
      await expect(stat(join(fixture.bridgeDir, "01-baseline.ready.json"))).rejects.toMatchObject({ code: "ENOENT" });
    }
  });
});
