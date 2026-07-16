import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { describe, expect, test } from "vitest";

import {
  WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_BLOCKER,
  WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_CONTRACT_VERSION,
  WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_DECISION,
  WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_FRESHNESS_MS,
  WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_INPUT_SCHEMA_VERSION,
  WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_MAX_RECORDS,
  WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_MISSION_ID,
  WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_RECEIPT_FIELDS,
  WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_RECEIPT_SCHEMA_VERSION,
  evaluateWelcomeAudioSourceCapabilityGate,
  validateWelcomeAudioSourceCapabilityGateReceipt,
} from "../scripts/crm-vnext-instagram-welcome-audio-source-capability-gate.mjs";

const NOW_MS = Date.parse("2026-07-16T17:00:00.000Z");
const OWNER = "synthetic-owner.account+exact";

const syntheticRecord = (ordinal: number) => ({
  ordinal,
  exact_target_utf8: `Synthetic.Target.${ordinal}+tag`,
  identity_binding_evidence: "exact_profile_identity_and_follow_signal_observed",
  followed_at: new Date(Date.parse("2026-07-14T01:00:00.000Z") + ordinal * 60_000)
    .toISOString(),
  source_observed_at: new Date(NOW_MS - 90_000 + ordinal).toISOString(),
  follow_time_evidence: "exact_absolute_source_timestamp",
  campaign_membership_evidence:
    "exact_follow_timestamp_within_approved_campaign_interval",
  bound_thread_reference_utf8: `synthetic-thread://${ordinal}/Exact+Case`,
  thread_binding_evidence: "exact_bound_thread_observed",
  owner_account_reference_utf8: OWNER,
  owner_binding_evidence: "exact_owner_account_observed",
  source_event_reference_utf8: `synthetic-source-event://${ordinal}/Exact+Case`,
  source_event_binding_evidence: "exact_source_event_observed",
});

const exactInput = (count = 1) => ({
  schema_version: WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_INPUT_SCHEMA_VERSION,
  mission_id: WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_MISSION_ID,
  surface_observation: {
    surface_kind: "instagram_notifications_recent_followers",
    load_status: "loaded",
    authentication_status: "authenticated_exact_owner",
    row_access_status: "exposed_exact",
    observed_at: "2026-07-16T16:59:00.000Z",
    timestamp_evidence: "absolute_timestamps_only_not_relative",
    inference_status: "explicit_not_inferred",
  },
  campaign_interval: {
    start_at: "2026-07-13T12:00:00.000Z",
    end_at: "2026-07-14T04:00:00.000Z",
    interval_evidence: "exact_approved_campaign_interval",
    campaign_membership_evidence: "explicit_source_event_membership",
    inference_status: "explicit_not_inferred",
  },
  record_order_evidence: "exact_source_order_with_contiguous_ordinals",
  owner_account_reference_utf8: OWNER,
  owner_binding_evidence: "exact_owner_account_observed",
  ordered_records: Array.from({ length: count }, (_, index) => syntheticRecord(index + 1)),
});

const minimalNoRowsInput = () => {
  const input = exactInput(0) as Record<string, any>;
  input.surface_observation.row_access_status = "not_exposed";
  input.campaign_interval = null;
  input.record_order_evidence = "no_rows_available_for_ordering";
  input.owner_account_reference_utf8 = null;
  input.owner_binding_evidence = "not_observed_due_to_no_accessible_rows";
  input.ordered_records = [];
  return input;
};

const clone = <T>(value: T): T => structuredClone(value);
const deepFreeze = <T>(value: T): T => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
};

describe("CRM Core welcome-audio source capability gate", () => {
  test("exposes exactly the three fixed decisions", () => {
    expect(Object.values(WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_DECISION)).toEqual([
      "source_capable",
      "blocked_no_accessible_rows",
      "blocked_ambiguous_or_inferred",
    ]);
    expect(WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_CONTRACT_VERSION).toBe(
      "crm_core_welcome_audio_source_capability_gate_v1",
    );
    expect(WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_MAX_RECORDS).toBe(8);
    expect(WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_FRESHNESS_MS).toBe(300_000);
  });

  test("classifies one exact synthetic record as source-capable without execution authority", () => {
    const receipt = evaluateWelcomeAudioSourceCapabilityGate(exactInput(), NOW_MS);

    expect(receipt.decision).toBe(WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_DECISION.SOURCE_CAPABLE);
    expect(receipt.records_seen_count).toBe(1);
    expect(receipt.records_valid_count).toBe(1);
    expect(receipt.source_capable).toBe(true);
    expect(receipt.source_execution).toBe(false);
    expect(receipt.canary_ready).toBe(false);
    expect(receipt.live_authority).toBe(false);
    expect(receipt.external_effect_invoked).toBe(false);
    expect(receipt.normalization_performed).toBe(false);
    expect(receipt.blocker_codes).toEqual([]);
    expect(Object.keys(receipt)).toEqual(WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_RECEIPT_FIELDS);
    expect(validateWelcomeAudioSourceCapabilityGateReceipt(receipt)).toEqual({
      ok: true,
      reason: null,
    });
  });

  test("accepts exactly eight valid records while keeping all later gates closed", () => {
    const receipt = evaluateWelcomeAudioSourceCapabilityGate(exactInput(8), NOW_MS);

    expect(receipt).toMatchObject({
      decision: WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_DECISION.SOURCE_CAPABLE,
      records_seen_count: 8,
      records_valid_count: 8,
      record_cap: 8,
      source_capable: true,
      source_execution: false,
      canary_ready: false,
      live_authority: false,
    });
  });

  test("classifies the exact actual-shaped minimal no-row envelope without inventing evidence", () => {
    const input = minimalNoRowsInput();
    const receipt = evaluateWelcomeAudioSourceCapabilityGate(input, NOW_MS);
    const serialized = JSON.stringify(receipt);

    expect(receipt).toMatchObject({
      decision: WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_DECISION.NO_ACCESSIBLE_ROWS,
      records_seen_count: 0,
      records_valid_count: 0,
      surface_loaded: true,
      surface_authenticated: true,
      rows_accessible: false,
      campaign_interval_exact: false,
      absolute_time_evidence_exact: false,
      deterministic_order_verified: true,
      exact_utf8_preserved: false,
      identity_evidence_exact: false,
      thread_evidence_exact: false,
      owner_evidence_exact: false,
      source_event_evidence_exact: false,
      duplicate_free: true,
      source_capable: false,
      source_execution: false,
      canary_ready: false,
      live_authority: false,
      blocker_codes: [WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_BLOCKER.NO_ACCESSIBLE_ROWS],
    });
    expect(serialized).not.toContain("zero_followers");
    expect(serialized).not.toContain("followers_count");
    expect(validateWelcomeAudioSourceCapabilityGateReceipt(receipt).ok).toBe(true);
  });

  test.each([
    [
      "nonempty records",
      (input: Record<string, any>) => {
        input.ordered_records = [syntheticRecord(1)];
      },
    ],
    [
      "claimed campaign interval",
      (input: Record<string, any>) => {
        input.campaign_interval = exactInput().campaign_interval;
      },
    ],
    [
      "private owner reference",
      (input: Record<string, any>) => {
        input.owner_account_reference_utf8 = OWNER;
      },
    ],
    [
      "claimed owner evidence",
      (input: Record<string, any>) => {
        input.owner_binding_evidence = "exact_owner_account_observed";
      },
    ],
    [
      "claimed source ordering",
      (input: Record<string, any>) => {
        input.record_order_evidence = "exact_source_order_with_contiguous_ordinals";
      },
    ],
  ])("rejects a no-row envelope that smuggles %s", (_label, mutate) => {
    const input = minimalNoRowsInput();
    mutate(input);
    const receipt = evaluateWelcomeAudioSourceCapabilityGate(input, NOW_MS);

    expect(receipt.decision).toBe(
      WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_DECISION.AMBIGUOUS_OR_INFERRED,
    );
    expect(receipt.blocker_codes).toContain(
      WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_BLOCKER.NO_ROWS_ENVELOPE,
    );
    expect(receipt.campaign_interval_exact).toBe(false);
    expect(receipt.owner_evidence_exact).toBe(false);
    expect(JSON.stringify(receipt)).not.toContain(OWNER);
    expect(receipt.source_execution).toBe(false);
    expect(receipt.canary_ready).toBe(false);
    expect(receipt.live_authority).toBe(false);
  });

  test.each([
    [
      "wrong mission",
      (input: Record<string, any>) => {
        input.mission_id = "synthetic-wrong-mission";
      },
      WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_BLOCKER.MISSION_BINDING,
    ],
    [
      "unauthenticated surface",
      (input: Record<string, any>) => {
        input.surface_observation.authentication_status = "unknown";
      },
      WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_BLOCKER.SURFACE,
    ],
    [
      "relative surface time",
      (input: Record<string, any>) => {
        input.surface_observation.observed_at = "one minute ago";
      },
      WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_BLOCKER.ABSOLUTE_TIME,
    ],
    [
      "stale surface time",
      (input: Record<string, any>) => {
        input.surface_observation.observed_at = "2026-07-16T16:50:00.000Z";
      },
      WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_BLOCKER.ABSOLUTE_TIME,
    ],
  ])("keeps a malformed minimal no-row envelope ambiguous for %s", (_label, mutate, blocker) => {
    const input = minimalNoRowsInput();
    mutate(input);
    const receipt = evaluateWelcomeAudioSourceCapabilityGate(input, NOW_MS);

    expect(receipt.decision).toBe(
      WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_DECISION.AMBIGUOUS_OR_INFERRED,
    );
    expect(receipt.blocker_codes).toContain(blocker);
  });

  test("does not call an exposed empty surface source-capable", () => {
    const receipt = evaluateWelcomeAudioSourceCapabilityGate(exactInput(0), NOW_MS);

    expect(receipt.decision).toBe(
      WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_DECISION.AMBIGUOUS_OR_INFERRED,
    );
    expect(receipt.blocker_codes).toContain(
      WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_BLOCKER.RECORD_COUNT,
    );
    expect(receipt.source_capable).toBe(false);
  });

  test("rejects more than eight records before treating any source as capable", () => {
    const receipt = evaluateWelcomeAudioSourceCapabilityGate(exactInput(9), NOW_MS);

    expect(receipt.decision).toBe(
      WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_DECISION.AMBIGUOUS_OR_INFERRED,
    );
    expect(receipt.records_seen_count).toBe(9);
    expect(receipt.records_valid_count).toBe(0);
    expect(receipt.blocker_codes).toContain(
      WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_BLOCKER.RECORD_COUNT,
    );
  });

  test.each([
    [
      "relative surface time",
      (input: ReturnType<typeof exactInput>) => {
        input.surface_observation.observed_at = "one minute ago";
      },
      WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_BLOCKER.ABSOLUTE_TIME,
    ],
    [
      "non-canonical UTC offset",
      (input: ReturnType<typeof exactInput>) => {
        input.surface_observation.observed_at = "2026-07-16T11:59:00-05:00";
      },
      WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_BLOCKER.ABSOLUTE_TIME,
    ],
    [
      "stale surface observation",
      (input: ReturnType<typeof exactInput>) => {
        input.surface_observation.observed_at = "2026-07-16T16:50:00.000Z";
      },
      WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_BLOCKER.ABSOLUTE_TIME,
    ],
    [
      "future record observation",
      (input: ReturnType<typeof exactInput>) => {
        input.ordered_records[0].source_observed_at = "2026-07-16T17:00:01.000Z";
      },
      WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_BLOCKER.ABSOLUTE_TIME,
    ],
    [
      "inferred campaign interval",
      (input: ReturnType<typeof exactInput>) => {
        input.campaign_interval.inference_status = "inferred";
      },
      WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_BLOCKER.CAMPAIGN_INTERVAL,
    ],
    [
      "uncorroborated OCR identity",
      (input: ReturnType<typeof exactInput>) => {
        input.ordered_records[0].identity_binding_evidence = "ocr_only";
      },
      WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_BLOCKER.IDENTITY_EVIDENCE,
    ],
  ])("fails closed on %s", (_label, mutate, expectedBlocker) => {
    const input = exactInput();
    mutate(input);
    const receipt = evaluateWelcomeAudioSourceCapabilityGate(input, NOW_MS);

    expect(receipt.decision).toBe(
      WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_DECISION.AMBIGUOUS_OR_INFERRED,
    );
    expect(receipt.blocker_codes).toContain(expectedBlocker);
    expect(receipt.source_execution).toBe(false);
    expect(receipt.canary_ready).toBe(false);
    expect(receipt.live_authority).toBe(false);
  });

  test("requires followed_at to be inside the exact sealed campaign interval", () => {
    const input = exactInput();
    input.ordered_records[0].followed_at = "2026-07-15T01:00:00.000Z";
    const receipt = evaluateWelcomeAudioSourceCapabilityGate(input, NOW_MS);

    expect(receipt.decision).toBe(
      WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_DECISION.AMBIGUOUS_OR_INFERRED,
    );
    expect(receipt.blocker_codes).toContain(
      WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_BLOCKER.ABSOLUTE_TIME,
    );
  });

  test("rejects unknown root and nested keys under the closed-key contract", () => {
    const rootExtra = { ...exactInput(), executable_action: "synthetic-noop" };
    const nestedExtra = exactInput() as ReturnType<typeof exactInput> & {
      surface_observation: ReturnType<typeof exactInput>["surface_observation"] & {
        private_capture_path?: string;
      };
    };
    nestedExtra.surface_observation.private_capture_path = "/synthetic/private/path";

    for (const input of [rootExtra, nestedExtra]) {
      const receipt = evaluateWelcomeAudioSourceCapabilityGate(input, NOW_MS);
      expect(receipt.decision).toBe(
        WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_DECISION.AMBIGUOUS_OR_INFERRED,
      );
      expect(receipt.blocker_codes).toContain(
        WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_BLOCKER.INPUT_SCHEMA,
      );
    }
  });

  test("rejects unknown or internally inconsistent row access", () => {
    const unknown = exactInput();
    unknown.surface_observation.row_access_status = "unknown";
    const inconsistent = exactInput();
    inconsistent.surface_observation.row_access_status = "not_exposed";

    for (const input of [unknown, inconsistent]) {
      const receipt = evaluateWelcomeAudioSourceCapabilityGate(input, NOW_MS);
      expect(receipt.decision).toBe(
        WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_DECISION.AMBIGUOUS_OR_INFERRED,
      );
      expect(receipt.blocker_codes).toContain(
        WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_BLOCKER.ROW_ACCESS,
      );
    }
  });

  test.each([
    ["identity", "exact_target_utf8", WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_BLOCKER.DUPLICATE_IDENTITY],
    ["thread", "bound_thread_reference_utf8", WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_BLOCKER.DUPLICATE_THREAD],
    ["source event", "source_event_reference_utf8", WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_BLOCKER.DUPLICATE_SOURCE_EVENT],
  ])("rejects duplicate exact %s values", (_label, field, expectedBlocker) => {
    const input = exactInput(2);
    (input.ordered_records[1] as Record<string, unknown>)[field] =
      (input.ordered_records[0] as Record<string, unknown>)[field];
    const receipt = evaluateWelcomeAudioSourceCapabilityGate(input, NOW_MS);

    expect(receipt.decision).toBe(
      WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_DECISION.AMBIGUOUS_OR_INFERRED,
    );
    expect(receipt.duplicate_free).toBe(false);
    expect(receipt.blocker_codes).toContain(expectedBlocker);
  });

  test("rejects nondeterministic record order", () => {
    const input = exactInput(2);
    input.ordered_records[1].ordinal = 1;
    const receipt = evaluateWelcomeAudioSourceCapabilityGate(input, NOW_MS);

    expect(receipt.deterministic_order_verified).toBe(false);
    expect(receipt.blocker_codes).toContain(
      WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_BLOCKER.RECORD_ORDER,
    );
  });

  test("preserves exact identity semantics without Gmail-style, case, or Unicode normalization", () => {
    const input = exactInput(2);
    input.ordered_records[0].exact_target_utf8 = "Synthetic.User+Tag.é";
    input.ordered_records[1].exact_target_utf8 = "synthetic.user+tag.e\u0301";
    const before = clone(input);
    const receipt = evaluateWelcomeAudioSourceCapabilityGate(input, NOW_MS);

    expect(receipt.decision).toBe(WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_DECISION.SOURCE_CAPABLE);
    expect(receipt.exact_utf8_preserved).toBe(true);
    expect(receipt.normalization_performed).toBe(false);
    expect(input).toEqual(before);
  });

  test.each([
    ["missing thread", "bound_thread_reference_utf8", ""],
    ["newline identity", "exact_target_utf8", "synthetic\nprivate"],
    ["malformed Unicode", "source_event_reference_utf8", "\ud800"],
  ])("rejects %s private evidence", (_label, field, value) => {
    const input = exactInput();
    (input.ordered_records[0] as Record<string, unknown>)[field] = value;
    const receipt = evaluateWelcomeAudioSourceCapabilityGate(input, NOW_MS);

    expect(receipt.decision).toBe(
      WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_DECISION.AMBIGUOUS_OR_INFERRED,
    );
    expect(receipt.blocker_codes).toContain(
      WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_BLOCKER.PRIVATE_UTF8,
    );
  });

  test("requires every record to bind the same exact owner", () => {
    const input = exactInput();
    input.ordered_records[0].owner_account_reference_utf8 = "synthetic-other-owner";
    const receipt = evaluateWelcomeAudioSourceCapabilityGate(input, NOW_MS);

    expect(receipt.owner_evidence_exact).toBe(false);
    expect(receipt.blocker_codes).toContain(
      WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_BLOCKER.OWNER_EVIDENCE,
    );
  });

  test("does not mutate deeply frozen input and produces deterministic receipts", () => {
    const input = deepFreeze(exactInput(3));
    const first = evaluateWelcomeAudioSourceCapabilityGate(input, NOW_MS);
    const second = evaluateWelcomeAudioSourceCapabilityGate(input, NOW_MS);

    expect(second).toEqual(first);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.blocker_codes)).toBe(true);
  });

  test("emits only aggregate receipt fields without private values, timestamps, paths, or digests", () => {
    const input = exactInput(2);
    const receipt = evaluateWelcomeAudioSourceCapabilityGate(input, NOW_MS);
    const serialized = JSON.stringify(receipt);
    const forbiddenPrivateValues = [
      input.owner_account_reference_utf8,
      input.surface_observation.observed_at,
      input.campaign_interval.start_at,
      input.campaign_interval.end_at,
      ...input.ordered_records.flatMap((record) => [
        record.exact_target_utf8,
        record.followed_at,
        record.source_observed_at,
        record.bound_thread_reference_utf8,
        record.owner_account_reference_utf8,
        record.source_event_reference_utf8,
      ]),
    ];

    expect(Object.keys(receipt)).toEqual(WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_RECEIPT_FIELDS);
    for (const privateValue of forbiddenPrivateValues) expect(serialized).not.toContain(privateValue);
    expect(serialized).not.toMatch(/\/Users\/|Documents|Mantis|sha256|digest|https?:\/\//i);
    expect(receipt.receipt_schema_version).toBe(
      WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_RECEIPT_SCHEMA_VERSION,
    );
  });

  test("blocks a callback-shaped or otherwise invalid clock value", () => {
    const callbackClock = () => NOW_MS;
    const receipt = evaluateWelcomeAudioSourceCapabilityGate(exactInput(), callbackClock as unknown as number);

    expect(receipt.decision).toBe(
      WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_DECISION.AMBIGUOUS_OR_INFERRED,
    );
    expect(receipt.blocker_codes).toContain(
      WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_BLOCKER.ABSOLUTE_TIME,
    );
  });

  test("rejects accessor-shaped input without invoking the getter", () => {
    const input = exactInput() as Record<string, unknown>;
    let invoked = false;
    Object.defineProperty(input, "mission_id", {
      enumerable: true,
      configurable: true,
      get() {
        invoked = true;
        throw new Error("synthetic-private-getter-marker");
      },
    });
    const receipt = evaluateWelcomeAudioSourceCapabilityGate(input, NOW_MS);

    expect(invoked).toBe(false);
    expect(receipt.decision).toBe(
      WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_DECISION.AMBIGUOUS_OR_INFERRED,
    );
    expect(receipt.blocker_codes).toEqual([
      WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_BLOCKER.INPUT_SCHEMA,
    ]);
  });

  test("fails closed for hostile input objects without copying thrown private markers", () => {
    const privateMarker = "synthetic-private-marker-never-copy";
    let trapInvoked = false;
    const hostile = new Proxy({}, {
      ownKeys() {
        trapInvoked = true;
        throw new Error(privateMarker);
      },
    });
    const receipt = evaluateWelcomeAudioSourceCapabilityGate(hostile, NOW_MS);

    expect(receipt.decision).toBe(
      WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_DECISION.AMBIGUOUS_OR_INFERRED,
    );
    expect(trapInvoked).toBe(false);
    expect(JSON.stringify(receipt)).not.toContain(privateMarker);
  });

  test("receipt validator is total for hostile getters, proxies, and revoked proxies", () => {
    const safeInvalid = {
      ok: false,
      reason: WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_BLOCKER.RECEIPT_CONTRACT,
    };
    const privateMarker = "synthetic-private-receipt-marker";
    const hostileOwnKeys = new Proxy({}, {
      ownKeys() {
        throw new Error(privateMarker);
      },
    });
    expect(validateWelcomeAudioSourceCapabilityGateReceipt(hostileOwnKeys)).toEqual(safeInvalid);

    const validReceipt = evaluateWelcomeAudioSourceCapabilityGate(exactInput(), NOW_MS);
    const hostileGetter = { ...validReceipt } as Record<string, unknown>;
    Object.defineProperty(hostileGetter, "decision", {
      enumerable: true,
      get() {
        throw new Error(privateMarker);
      },
    });
    expect(validateWelcomeAudioSourceCapabilityGateReceipt(hostileGetter)).toEqual(safeInvalid);

    const blockerCodesProxy = {
      ...validReceipt,
      blocker_codes: new Proxy([], {
        ownKeys() {
          throw new Error(privateMarker);
        },
      }),
    };
    expect(validateWelcomeAudioSourceCapabilityGateReceipt(blockerCodesProxy)).toEqual(safeInvalid);

    const revocable = Proxy.revocable({}, {});
    revocable.revoke();
    expect(validateWelcomeAudioSourceCapabilityGateReceipt(revocable.proxy)).toEqual(safeInvalid);
  });

  test("receipt validator rejects missing fields and contradictory authority flags", () => {
    const receipt = evaluateWelcomeAudioSourceCapabilityGate(exactInput(), NOW_MS);
    const { live_authority: _liveAuthority, ...missingField } = receipt;

    expect(validateWelcomeAudioSourceCapabilityGateReceipt(missingField).ok).toBe(false);
    for (const patch of [
      { decision: WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_DECISION.NO_ACCESSIBLE_ROWS },
      { source_capable: false },
      { source_execution: true },
      { canary_ready: true },
      { live_authority: true },
      { external_effect_invoked: true },
      { blocker_codes: ["unknown-private-looking-code"] },
    ]) expect(validateWelcomeAudioSourceCapabilityGateReceipt({ ...receipt, ...patch }).ok).toBe(false);
  });

  test("receipt validator rejects invented evidence on a no-accessible-rows decision", () => {
    const receipt = evaluateWelcomeAudioSourceCapabilityGate(minimalNoRowsInput(), NOW_MS);

    for (const patch of [
      { campaign_interval_exact: true },
      { absolute_time_evidence_exact: true },
      { exact_utf8_preserved: true },
      { identity_evidence_exact: true },
      { thread_evidence_exact: true },
      { owner_evidence_exact: true },
      { source_event_evidence_exact: true },
      { deterministic_order_verified: false },
      { duplicate_free: false },
    ]) expect(validateWelcomeAudioSourceCapabilityGateReceipt({ ...receipt, ...patch }).ok).toBe(false);
  });

  test("module import has no side effects and exposes the exact public surface", async () => {
    const modulePath = join(
      process.cwd(),
      "scripts/crm-vnext-instagram-welcome-audio-source-capability-gate.mjs",
    );
    const moduleUrl = pathToFileURL(modulePath);
    moduleUrl.searchParams.set("import_side_effect_test", String(Date.now()));
    const imported = await import(moduleUrl.href);

    expect(Object.keys(imported).sort()).toEqual([
      "WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_BLOCKER",
      "WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_CONTRACT_VERSION",
      "WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_DECISION",
      "WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_FRESHNESS_MS",
      "WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_INPUT_SCHEMA_VERSION",
      "WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_MAX_RECORDS",
      "WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_MISSION_ID",
      "WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_RECEIPT_FIELDS",
      "WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_RECEIPT_SCHEMA_VERSION",
      "evaluateWelcomeAudioSourceCapabilityGate",
      "validateWelcomeAudioSourceCapabilityGateReceipt",
    ]);
    expect(Object.values(imported).filter((value) => typeof value === "function")).toHaveLength(2);
  });

  test("implementation has no prohibited imports, runtime surfaces, or private roots", async () => {
    const source = await readFile(
      join(process.cwd(), "scripts/crm-vnext-instagram-welcome-audio-source-capability-gate.mjs"),
      "utf8",
    );

    expect(source.match(/^[ \t]*import\s.+$/gm)).toEqual([
      "import { types as nodeUtilTypes } from 'node:util';",
    ]);
    expect(source).not.toMatch(/\brequire\s*\(|\bfetch\s*\(|XMLHttpRequest|WebSocket/);
    expect(source).not.toMatch(/node:(?:fs|http|https|net|tls|child_process)|playwright|puppeteer/);
    expect(source).not.toMatch(/process\.|Date\.now\s*\(|setTimeout\s*\(|setInterval\s*\(/);
    expect(source).not.toMatch(/\/Users\/|Documents\/|Mantis|\.env\b/);
  });
});
