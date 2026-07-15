import { execFile } from "node:child_process";
import { chmod, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

import { afterEach, describe, expect, test } from "vitest";

import {
  WELCOME_AUDIO_SURFACE,
} from "../scripts/crm-vnext-instagram-welcome-audio-operation-guard.mjs";
import {
  WELCOME_AUDIO_SAFARI_ACTUATOR_RESULT_FIELDS,
  WELCOME_AUDIO_SAFARI_DETERMINISTIC_SCENARIO,
  WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER,
  WELCOME_AUDIO_SAFARI_OPERATIONAL_DECISION,
  WELCOME_AUDIO_SAFARI_OPERATIONAL_EXECUTION_MODE,
  WELCOME_AUDIO_SAFARI_OPERATIONAL_RECEIPT_FIELDS,
  createWelcomeAudioSafariActuatorPort,
  executeWelcomeAudioSafariAttempt,
  validateWelcomeAudioSafariOperationalReceipt,
} from "../scripts/crm-vnext-instagram-welcome-audio-safari-operational-executor.mjs";

const execFileAsync = promisify(execFile);
const MODULE_PATH = resolve(
  process.cwd(),
  "scripts/crm-vnext-instagram-welcome-audio-safari-operational-executor.mjs",
);
const cleanupPaths: string[] = [];

afterEach(async () => {
  await Promise.all(cleanupPaths.splice(0).map((path) => rm(path, {
    recursive: true,
    force: true,
  })));
});

describe("Instagram welcome-audio Safari operational executor surface", () => {
  test.each(Object.values(WELCOME_AUDIO_SAFARI_DETERMINISTIC_SCENARIO))(
    "brands only the fixed deterministic no-effect scenario %s",
    (deterministicScenario) => {
      const port = createWelcomeAudioSafariActuatorPort({
        execution_mode: WELCOME_AUDIO_SAFARI_OPERATIONAL_EXECUTION_MODE,
        deterministic_scenario: deterministicScenario,
      });

      expect(port).toEqual({
        surface: WELCOME_AUDIO_SURFACE.STATUS,
        surface_detail: WELCOME_AUDIO_SURFACE.DETAIL,
        execution_mode: WELCOME_AUDIO_SAFARI_OPERATIONAL_EXECUTION_MODE,
      });
      expect(Object.isFrozen(port)).toBe(true);
      expect(Object.keys(port).sort()).toEqual([
        "execution_mode",
        "surface",
        "surface_detail",
      ]);
      expect(Object.values(port)).not.toContain(deterministicScenario);
      expect("invoke" in port).toBe(false);
      expect("driver" in port).toBe(false);
    },
  );

  test("rejects production-shaped, unknown, or callback-bearing actuator construction", () => {
    expect(() => createWelcomeAudioSafariActuatorPort()).toThrow(
      WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.ACTUATOR_INVALID,
    );
    expect(() => createWelcomeAudioSafariActuatorPort({
      execution_mode: "live",
      deterministic_scenario: WELCOME_AUDIO_SAFARI_DETERMINISTIC_SCENARIO.STRONG_CONFIRMED,
    })).toThrow(WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.ACTUATOR_INVALID);
    expect(() => createWelcomeAudioSafariActuatorPort({
      execution_mode: WELCOME_AUDIO_SAFARI_OPERATIONAL_EXECUTION_MODE,
      deterministic_scenario: "unknown",
      driver: () => ({ effect_boundary_entered: true }),
    } as any)).toThrow(WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.ACTUATOR_INVALID);
  });

  test("publishes exact actuator and receipt allowlists with no private fields", () => {
    expect(WELCOME_AUDIO_SAFARI_ACTUATOR_RESULT_FIELDS).toEqual([
      "result_schema_version",
      "bound_to_current_operation",
      "effect_boundary_entered",
      "send_control_actuation_count",
      "attempted_at",
      "confirmation_marker",
      "confirmation_checked_at",
    ]);
    expect(WELCOME_AUDIO_SAFARI_OPERATIONAL_RECEIPT_FIELDS).toEqual([
      "receipt_schema_version",
      "operational_executor_contract_version",
      "redaction_status",
      "execution_mode",
      "decision",
      "ready_guard_decision",
      "terminal_guard_decision",
      "claim_consumed_by_current_invocation",
      "pending_record_present",
      "terminal_record_present",
      "effect_boundary_entered",
      "send_control_actuation_count",
      "confirmation_marker",
      "external_effect_invoked",
      "browser_used",
      "network_used",
      "retry_disposition",
      "production_ready",
      "blocker_codes",
    ]);
    expect(WELCOME_AUDIO_SAFARI_OPERATIONAL_RECEIPT_FIELDS).not.toEqual(expect.arrayContaining([
      "canonical_operation_sha256",
      "claim_owner_id",
      "claim_token_id",
      "attempt_id",
      "registry_root",
      "recipient",
      "asset_path",
    ]));
  });

  test("rejects a forged or missing capability before any actuator boundary", async () => {
    const port = createWelcomeAudioSafariActuatorPort({
      execution_mode: WELCOME_AUDIO_SAFARI_OPERATIONAL_EXECUTION_MODE,
      deterministic_scenario: WELCOME_AUDIO_SAFARI_DETERMINISTIC_SCENARIO.STRONG_CONFIRMED,
    });

    for (const privateClaimCapability of [null, {}, Object.freeze({ capability_marker: Symbol() })]) {
      const receipt = await executeWelcomeAudioSafariAttempt({
        registry_root: resolve(tmpdir(), "synthetic-never-opened-registry"),
        private_claim_capability: privateClaimCapability,
        expected_canonical_operation_sha256: "1".repeat(64),
        branded_safari_actuator_port: port,
        now_ms: Date.parse("2026-07-14T16:00:00.000Z"),
      });
      expect(receipt).toMatchObject({
        decision: WELCOME_AUDIO_SAFARI_OPERATIONAL_DECISION.BLOCKED,
        claim_consumed_by_current_invocation: false,
        effect_boundary_entered: false,
        send_control_actuation_count: 0,
        external_effect_invoked: false,
        browser_used: false,
        network_used: false,
        production_ready: false,
        blocker_codes: [WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.CAPABILITY_INVALID],
      });
      expect(Object.keys(receipt).sort())
        .toEqual([...WELCOME_AUDIO_SAFARI_OPERATIONAL_RECEIPT_FIELDS].sort());
      expect(validateWelcomeAudioSafariOperationalReceipt(receipt))
        .toEqual({ ok: true, reason: null });
    }
  });

  test("imports in a fresh process with no output or filesystem effect", async () => {
    const workdir = await mkdtemp(join(tmpdir(), "crm-core-welcome-operational-import-"));
    await chmod(workdir, 0o700);
    cleanupPaths.push(workdir);
    const before = await readdir(workdir);
    const { stdout, stderr } = await execFileAsync(process.execPath, [
      "--input-type=module",
      "--eval",
      `await import(${JSON.stringify(pathToFileURL(MODULE_PATH).href)});`,
    ], { cwd: workdir, maxBuffer: 1024 * 1024 });
    const after = await readdir(workdir);

    expect(stdout).toBe("");
    expect(stderr).toBe("");
    expect(before).toEqual([]);
    expect(after).toEqual([]);
  });

  test("contains no operational CLI, network client, browser automation package, or subprocess import", async () => {
    const source = await readFile(MODULE_PATH, "utf8");
    const productiveImports = [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)]
      .map((match) => match[1]);

    expect(productiveImports.sort()).toEqual([
      "./crm-vnext-instagram-welcome-audio-claim-writer.mjs",
      "./crm-vnext-instagram-welcome-audio-one-shot-store.mjs",
      "./crm-vnext-instagram-welcome-audio-operation-guard.mjs",
    ].sort());
    expect(source).not.toMatch(/\b(fetch|XMLHttpRequest|WebSocket)\s*\(/);
    expect(source).not.toMatch(/node:(?:child_process|http|https|net|tls)/);
    expect(source).not.toMatch(/(?:playwright|puppeteer|webdriver|selenium)/i);
    expect(source).not.toMatch(/process\.argv|import\.meta\.main/);
  });

  test("keeps the literal genuine-port guard and pending-before-consume-before-rendezvous order", async () => {
    const source = await readFile(MODULE_PATH, "utf8");
    const pendingIndex = source.indexOf("filePath: paths.pending");
    const consumeIndex = source.indexOf(
      "const consumeStatus = consumeCapability();",
      pendingIndex,
    );
    const authorityConsumeIndex = source.indexOf(
      "consumeReservedWelcomeAudioSafariOperationAuthorityForActuation(",
      consumeIndex,
    );
    const rendezvousArmIndex = source.indexOf(
      "const deferredRendezvousState = armWelcomeAudioSafariDeferredActuatorRendezvous(",
      authorityConsumeIndex,
    );
    const actuationIndex = source.indexOf(
      "actuatorResult = invokeBrandedSafariActuator",
      rendezvousArmIndex,
    );
    const rendezvousWaitIndex = source.indexOf(
      "consumeWelcomeAudioSafariDeferredActuatorRendezvousResult(",
      rendezvousArmIndex,
    );
    const terminalIndex = source.indexOf(
      "await publishWelcomeAudioOneShotTerminalFromPending",
      rendezvousWaitIndex,
    );

    expect(source).toContain(
      "if (!ACTUATOR_PORT_STATE.has(branded_safari_actuator_port)) {",
    );
    expect(pendingIndex).toBeGreaterThan(-1);
    expect(consumeIndex).toBeGreaterThan(pendingIndex);
    expect(authorityConsumeIndex).toBeGreaterThan(consumeIndex);
    expect(rendezvousArmIndex).toBeGreaterThan(authorityConsumeIndex);
    expect(actuationIndex).toBeGreaterThan(rendezvousArmIndex);
    expect(rendezvousWaitIndex).toBeGreaterThan(rendezvousArmIndex);
    expect(terminalIndex).toBeGreaterThan(rendezvousWaitIndex);
  });
});
