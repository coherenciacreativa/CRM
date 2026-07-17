import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

import * as adapterModule from "../scripts/crm-vnext-instagram-welcome-audio-ui-attested-follower-source-adapter.mjs";

const {
  WELCOME_AUDIO_UI_ATTESTED_SOURCE_ADAPTER_CONTRACT_VERSION,
  WELCOME_AUDIO_UI_ATTESTED_SOURCE_BLOCKER,
  WELCOME_AUDIO_UI_ATTESTED_SOURCE_DECISION,
  WELCOME_AUDIO_UI_ATTESTED_SOURCE_FRESHNESS_MS,
  WELCOME_AUDIO_UI_ATTESTED_SOURCE_INPUT_SCHEMA_VERSION,
  WELCOME_AUDIO_UI_ATTESTED_SOURCE_MAX_RECORDS,
  WELCOME_AUDIO_UI_ATTESTED_SOURCE_PROJECTION_SCHEMA_VERSION,
  WELCOME_AUDIO_UI_ATTESTED_SOURCE_RECEIPT_FIELDS,
  WELCOME_AUDIO_UI_ATTESTED_SOURCE_RECEIPT_SCHEMA_VERSION,
  WELCOME_AUDIO_UI_ATTESTED_SOURCE_CLASS,
  WELCOME_AUDIO_UI_ATTESTED_RELATIONSHIP_EVIDENCE,
  WELCOME_AUDIO_UI_ATTESTED_RELATIONSHIP_STATE,
  adaptWelcomeAudioUiAttestedFollowerSource,
  validateWelcomeAudioUiAttestedFollowerSourceProjection,
  validateWelcomeAudioUiAttestedFollowerSourceReceipt,
} = adapterModule;

const NOW_MS = Date.parse("2026-07-16T15:00:00.000Z");

const inputFixture = () => ({
  schema_version: WELCOME_AUDIO_UI_ATTESTED_SOURCE_INPUT_SCHEMA_VERSION,
  source_class: WELCOME_AUDIO_UI_ATTESTED_SOURCE_CLASS,
  mission_id: "synthetic_ui_attested_mission_001",
  notification_row: {
    row_ordinal: 1,
    exact_target_utf8: "Synthetic.Exact+Tag_é",
    notification_evidence: "explicit_recent_follower_notification_row",
    follower_signal: "started_following_owner",
    time_bucket_utf8: "synthetic visible bucket 2 d",
    time_bucket_evidence: "explicit_visible_relative_time_label",
    attested_at: "2026-07-16T14:59:00.000Z",
    inference_status: "explicit_not_inferred",
  },
  profile: {
    exact_target_utf8: "Synthetic.Exact+Tag_é",
    notification_to_profile_binding: "exact",
    profile_identity_evidence: "exact_private_visual_profile_identity",
    follows_owner: "confirmed",
    follows_owner_evidence: "explicit_visible_follows_owner_signal",
    attested_at: "2026-07-16T14:59:10.000Z",
    inference_status: "explicit_not_inferred",
  },
  thread: {
    bound_thread_reference_utf8: "synthetic-thread-reference/Exact+Case",
    profile_to_thread_binding: "exact",
    thread_binding_evidence: "exact_bound_thread_observed",
    attested_at: "2026-07-16T14:59:20.000Z",
    inference_status: "explicit_not_inferred",
  },
  owner: {
    owner_account_reference_utf8: "synthetic-owner-reference/Exact+Case",
    owner_binding_evidence: "exact_owner_account_observed",
    attested_at: "2026-07-16T14:59:30.000Z",
    inference_status: "explicit_not_inferred",
  },
  dedupe: {
    status: "clear_no_prior_welcome_or_attempt",
    already_welcomed_status: "not_found",
    send_history_status: "no_prior_attempt",
    exact_target_utf8: "Synthetic.Exact+Tag_é",
    bound_thread_reference_utf8: "synthetic-thread-reference/Exact+Case",
    owner_account_reference_utf8: "synthetic-owner-reference/Exact+Case",
    checked_at: "2026-07-16T14:59:40.000Z",
    dedupe_evidence: "exact_bound_thread_history_observed",
    inference_status: "explicit_not_inferred",
  },
  exact_follow_timestamp_claimed: false,
  provider_event_id_claimed: false,
  campaign_membership_claimed: false,
});

const adapt = (input: unknown, nowMs = NOW_MS) => (
  adaptWelcomeAudioUiAttestedFollowerSource(input, { nowMs })
);

const recentEventInputFixture = () => {
  const input = inputFixture();
  input.notification_row.time_bucket_utf8 = "synthetic visible bucket 3 d";
  input.profile.follows_owner = WELCOME_AUDIO_UI_ATTESTED_RELATIONSHIP_STATE
    .RECENT_FOLLOW_EVENT_NO_EXPLICIT_CONTRADICTION;
  input.profile.follows_owner_evidence = WELCOME_AUDIO_UI_ATTESTED_RELATIONSHIP_EVIDENCE
    .RECENT_EVENT_VISIBLE_3_TO_7_DAY_PILOT_BUCKET;
  return input;
};

const assertBlocked = (input: unknown, blocker: string) => {
  const result = adapt(input);
  expect(result.private_projection).toBeNull();
  expect(result.redacted_receipt.decision).toBe(
    WELCOME_AUDIO_UI_ATTESTED_SOURCE_DECISION.BLOCKED,
  );
  expect(result.redacted_receipt.blocker_codes).toContain(blocker);
  expect(validateWelcomeAudioUiAttestedFollowerSourceReceipt(
    result.redacted_receipt,
  )).toEqual({ ok: true, reason: null });
};

describe("UI-attested follower source adapter", () => {
  test("P0 emits one exact immutable private projection and aggregate-only receipt", () => {
    const input = inputFixture();
    const result = adapt(input);
    const projection = result.private_projection;

    expect(projection).not.toBeNull();
    expect(Object.keys(projection!)).toEqual([
      "schema_version",
      "adapter_contract_version",
      "source_class",
      "mission_id",
      "notification_row",
      "profile",
      "thread",
      "owner",
      "dedupe",
      "exact_follow_timestamp_claimed",
      "provider_event_id_claimed",
      "campaign_membership_claimed",
      "anchors",
      "source_evidence_sha256",
    ]);
    expect(Object.keys(projection!.anchors)).toEqual([
      "source_evidence_anchor_sha256",
      "profile_anchor_sha256",
      "candidate_anchor_sha256",
      "thread_anchor_sha256",
      "owner_anchor_sha256",
      "dedupe_anchor_sha256",
    ]);
    expect(projection!.notification_row.exact_target_utf8).toBe(
      input.notification_row.exact_target_utf8,
    );
    expect(projection!.notification_row.time_bucket_utf8).toBe(
      input.notification_row.time_bucket_utf8,
    );
    expect(projection!.notification_row.attested_at).toBe(
      input.notification_row.attested_at,
    );
    expect(projection!.exact_follow_timestamp_claimed).toBe(false);
    expect(projection!.provider_event_id_claimed).toBe(false);
    expect(projection!.campaign_membership_claimed).toBe(false);
    expect(Object.values(projection!.anchors).every(
      (value) => /^[a-f0-9]{64}$/.test(value),
    )).toBe(true);
    expect(projection!.source_evidence_sha256).toMatch(/^[a-f0-9]{64}$/);

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(projection)).toBe(true);
    expect(Object.isFrozen(projection!.notification_row)).toBe(true);
    expect(Object.isFrozen(projection!.profile)).toBe(true);
    expect(Object.isFrozen(projection!.thread)).toBe(true);
    expect(Object.isFrozen(projection!.owner)).toBe(true);
    expect(Object.isFrozen(projection!.dedupe)).toBe(true);
    expect(Object.isFrozen(projection!.anchors)).toBe(true);
    expect(Object.isFrozen(result.redacted_receipt)).toBe(true);
    expect(Object.isFrozen(result.redacted_receipt.blocker_codes)).toBe(true);

    const projectionValidation = validateWelcomeAudioUiAttestedFollowerSourceProjection(
      projection,
      { nowMs: NOW_MS },
    );
    expect(projectionValidation).toEqual({ ok: true, reason: null });
    expect(Object.isFrozen(projectionValidation)).toBe(true);
    expect(validateWelcomeAudioUiAttestedFollowerSourceReceipt(
      result.redacted_receipt,
    )).toEqual({ ok: true, reason: null });
    expect(result.redacted_receipt).toMatchObject({
      receipt_schema_version: WELCOME_AUDIO_UI_ATTESTED_SOURCE_RECEIPT_SCHEMA_VERSION,
      adapter_contract_version: WELCOME_AUDIO_UI_ATTESTED_SOURCE_ADAPTER_CONTRACT_VERSION,
      source_class: WELCOME_AUDIO_UI_ATTESTED_SOURCE_CLASS,
      decision: WELCOME_AUDIO_UI_ATTESTED_SOURCE_DECISION.READY,
      evidence_record_count: 1,
      record_cap: WELCOME_AUDIO_UI_ATTESTED_SOURCE_MAX_RECORDS,
      exact_follow_timestamp_claimed: false,
      provider_event_id_claimed: false,
      campaign_membership_claimed: false,
      normalization_performed: false,
      source_execution: false,
      canary_ready: false,
      live_authority: false,
      send_allowed: false,
      external_effect_invoked: false,
      browser_used: false,
      network_used: false,
      blocker_codes: [],
    });
  });

  test("P0 is deterministic, preserves its input, and does not normalize exact UTF-8", () => {
    const input = inputFixture();
    const before = structuredClone(input);
    const first = adapt(input);
    const second = adapt(input);

    expect(first).toEqual(second);
    expect(input).toEqual(before);

    const variants = [
      "Synthetic.Exact+Tag_é",
      "synthetic.exact+tag_é",
      "SyntheticExact+Tag_é",
      "Synthetic.Exact+Tag_e\u0301",
    ];
    const projections = variants.map((exactTarget) => {
      const variant = inputFixture();
      variant.notification_row.exact_target_utf8 = exactTarget;
      variant.profile.exact_target_utf8 = exactTarget;
      variant.dedupe.exact_target_utf8 = exactTarget;
      return adapt(variant).private_projection!;
    });
    expect(projections.map((projection) => projection.notification_row.exact_target_utf8))
      .toEqual(variants);
    expect(new Set(projections.map(
      (projection) => projection.anchors.candidate_anchor_sha256,
    )).size).toBe(variants.length);
  });

  test("P0 admits a bound 3-to-7-day pilot follow event without claiming a current badge", () => {
    const current = adapt(inputFixture());
    const recentEvent = adapt(recentEventInputFixture());

    expect(recentEvent.private_projection).not.toBeNull();
    expect(recentEvent.private_projection!.profile).toMatchObject({
      follows_owner: WELCOME_AUDIO_UI_ATTESTED_RELATIONSHIP_STATE
        .RECENT_FOLLOW_EVENT_NO_EXPLICIT_CONTRADICTION,
      follows_owner_evidence: WELCOME_AUDIO_UI_ATTESTED_RELATIONSHIP_EVIDENCE
        .RECENT_EVENT_VISIBLE_3_TO_7_DAY_PILOT_BUCKET,
    });
    expect(recentEvent.redacted_receipt).toMatchObject({
      decision: WELCOME_AUDIO_UI_ATTESTED_SOURCE_DECISION.READY,
      ui_attested_source_ready: true,
      follows_owner_confirmed: false,
      blocker_codes: [],
    });
    expect(validateWelcomeAudioUiAttestedFollowerSourceProjection(
      recentEvent.private_projection,
      { nowMs: NOW_MS },
    )).toEqual({ ok: true, reason: null });
    expect(validateWelcomeAudioUiAttestedFollowerSourceReceipt(
      recentEvent.redacted_receipt,
    )).toEqual({ ok: true, reason: null });
    expect(recentEvent.private_projection!.source_evidence_sha256).not.toBe(
      current.private_projection!.source_evidence_sha256,
    );
    expect(recentEvent.private_projection!.anchors).toEqual(
      current.private_projection!.anchors,
    );
  });

  test.each([
    "synthetic visible bucket 3 d",
    "synthetic visible bucket 4 days",
    "hace 6 días",
    "hace 7 dias",
  ])("P0 admits an exact supported bounded day bucket: %s", (timeBucket) => {
    const input = recentEventInputFixture();
    input.notification_row.time_bucket_utf8 = timeBucket;
    expect(adapt(input).private_projection).not.toBeNull();
  });

  test.each([
    "synthetic visible bucket 2 d",
    "synthetic visible bucket 8 days",
    "hace varios días",
    "3 d / 4 d",
  ])("P0 rejects an out-of-window or ambiguous bounded day bucket: %s", (timeBucket) => {
    const input = recentEventInputFixture();
    input.notification_row.time_bucket_utf8 = timeBucket;
    assertBlocked(input, WELCOME_AUDIO_UI_ATTESTED_SOURCE_BLOCKER.TIME_BUCKET);
  });

  test("P0 keeps binding anchors stable across observation-time changes", () => {
    const first = adapt(inputFixture()).private_projection!;
    const shifted = inputFixture();
    shifted.notification_row.time_bucket_utf8 = "synthetic visible bucket 3 d";
    shifted.notification_row.attested_at = "2026-07-16T14:58:00.000Z";
    shifted.profile.attested_at = "2026-07-16T14:58:10.000Z";
    shifted.thread.attested_at = "2026-07-16T14:58:20.000Z";
    shifted.owner.attested_at = "2026-07-16T14:58:30.000Z";
    shifted.dedupe.checked_at = "2026-07-16T14:58:40.000Z";
    const second = adapt(shifted).private_projection!;

    expect(second.anchors).toEqual(first.anchors);
    expect(second.source_evidence_sha256).not.toBe(first.source_evidence_sha256);

    const differentOrdinal = inputFixture();
    differentOrdinal.notification_row.row_ordinal = 2;
    const third = adapt(differentOrdinal).private_projection!;
    expect(third.anchors.source_evidence_anchor_sha256).not.toBe(
      first.anchors.source_evidence_anchor_sha256,
    );
    expect(third.anchors.candidate_anchor_sha256).toBe(
      first.anchors.candidate_anchor_sha256,
    );
    expect(third.anchors.profile_anchor_sha256).toBe(
      first.anchors.profile_anchor_sha256,
    );
  });

  test("P0 rejects all exact-time, provider-id, and campaign assertions", () => {
    for (const field of [
      "exact_follow_timestamp_claimed",
      "provider_event_id_claimed",
      "campaign_membership_claimed",
    ] as const) {
      const input = inputFixture();
      input[field] = true;
      assertBlocked(input, WELCOME_AUDIO_UI_ATTESTED_SOURCE_BLOCKER.UNSUPPORTED_CLAIM);
    }

    for (const [section, field, value] of [
      ["notification_row", "followed_at", "2026-07-16T14:00:00.000Z"],
      ["notification_row", "provider_event_id", "synthetic-event"],
      ["profile", "campaign_membership", "claimed"],
    ] as const) {
      const input: any = inputFixture();
      input[section][field] = value;
      assertBlocked(input, WELCOME_AUDIO_UI_ATTESTED_SOURCE_BLOCKER.INPUT_SCHEMA);
    }
  });

  test("P0 rejects every ambiguous or conflicting exact binding", () => {
    const cases: Array<[string, (input: ReturnType<typeof inputFixture>) => void, string]> = [
      ["notification", (input) => {
        input.notification_row.inference_status = "inferred";
      }, WELCOME_AUDIO_UI_ATTESTED_SOURCE_BLOCKER.NOTIFICATION],
      ["bucket", (input) => {
        input.notification_row.time_bucket_evidence = "inferred";
      }, WELCOME_AUDIO_UI_ATTESTED_SOURCE_BLOCKER.TIME_BUCKET],
      ["identity", (input) => {
        input.profile.exact_target_utf8 += "-different";
      }, WELCOME_AUDIO_UI_ATTESTED_SOURCE_BLOCKER.IDENTITY_BINDING],
      ["profile", (input) => {
        input.profile.notification_to_profile_binding = "ambiguous";
      }, WELCOME_AUDIO_UI_ATTESTED_SOURCE_BLOCKER.IDENTITY_BINDING],
      ["follows owner", (input) => {
        input.profile.follows_owner = "unknown";
      }, WELCOME_AUDIO_UI_ATTESTED_SOURCE_BLOCKER.FOLLOWS_OWNER],
      ["relationship evidence", (input) => {
        input.profile.follows_owner = WELCOME_AUDIO_UI_ATTESTED_RELATIONSHIP_STATE
          .RECENT_FOLLOW_EVENT_NO_EXPLICIT_CONTRADICTION;
        input.profile.follows_owner_evidence = "unsupported_recent_event_evidence";
      }, WELCOME_AUDIO_UI_ATTESTED_SOURCE_BLOCKER.FOLLOWS_OWNER],
      ["thread", (input) => {
        input.thread.profile_to_thread_binding = "ambiguous";
      }, WELCOME_AUDIO_UI_ATTESTED_SOURCE_BLOCKER.THREAD_BINDING],
      ["thread reference", (input) => {
        input.dedupe.bound_thread_reference_utf8 += "-different";
      }, WELCOME_AUDIO_UI_ATTESTED_SOURCE_BLOCKER.THREAD_BINDING],
      ["owner", (input) => {
        input.owner.inference_status = "inferred";
      }, WELCOME_AUDIO_UI_ATTESTED_SOURCE_BLOCKER.OWNER_BINDING],
      ["owner reference", (input) => {
        input.dedupe.owner_account_reference_utf8 += "-different";
      }, WELCOME_AUDIO_UI_ATTESTED_SOURCE_BLOCKER.OWNER_BINDING],
      ["dedupe", (input) => {
        input.dedupe.status = "unknown";
      }, WELCOME_AUDIO_UI_ATTESTED_SOURCE_BLOCKER.DEDUPE],
    ];
    for (const [, mutate, blocker] of cases) {
      const input = inputFixture();
      mutate(input);
      assertBlocked(input, blocker);
    }
  });

  test("P1 rejects invalid, stale, future, or wrongly ordered attestations", () => {
    const cases: Array<(input: ReturnType<typeof inputFixture>) => void> = [
      (input) => { input.notification_row.attested_at = "not-a-time"; },
      (input) => { input.notification_row.attested_at = "2026-07-16T14:54:59.999Z"; },
      (input) => { input.profile.attested_at = "2026-07-16T15:01:00.001Z"; },
      (input) => { input.dedupe.checked_at = "2026-07-16T14:59:15.000Z"; },
    ];
    for (const mutate of cases) {
      const input = inputFixture();
      mutate(input);
      assertBlocked(input, WELCOME_AUDIO_UI_ATTESTED_SOURCE_BLOCKER.TIME_EVIDENCE);
    }
    const oneMillisecondFuture = new Date(NOW_MS + 1).toISOString();
    const futureMutations: Array<(input: ReturnType<typeof inputFixture>) => void> = [
      (input) => { input.notification_row.attested_at = oneMillisecondFuture; },
      (input) => { input.profile.attested_at = oneMillisecondFuture; },
      (input) => { input.thread.attested_at = oneMillisecondFuture; },
      (input) => { input.owner.attested_at = oneMillisecondFuture; },
      (input) => { input.dedupe.checked_at = oneMillisecondFuture; },
    ];
    for (const mutate of futureMutations) {
      const input = inputFixture();
      mutate(input);
      assertBlocked(input, WELCOME_AUDIO_UI_ATTESTED_SOURCE_BLOCKER.TIME_EVIDENCE);
    }
    expect(WELCOME_AUDIO_UI_ATTESTED_SOURCE_FRESHNESS_MS).toBe(5 * 60 * 1000);
  });

  test("P1 enforces the one-through-eight closed record position", () => {
    for (const ordinal of [0, 9, 1.5, Number.NaN]) {
      const input = inputFixture();
      input.notification_row.row_ordinal = ordinal;
      assertBlocked(input, WELCOME_AUDIO_UI_ATTESTED_SOURCE_BLOCKER.NOTIFICATION);
    }
    for (const ordinal of [1, 8]) {
      const input = inputFixture();
      input.notification_row.row_ordinal = ordinal;
      expect(adapt(input).private_projection).not.toBeNull();
    }
  });

  test("P1 rejects malformed private UTF-8 and closed-key violations", () => {
    const malformedValues = ["", "line\nbreak", "nul\0byte", "\ud800"];
    for (const value of malformedValues) {
      const input = inputFixture();
      input.notification_row.exact_target_utf8 = value;
      input.profile.exact_target_utf8 = value;
      input.dedupe.exact_target_utf8 = value;
      assertBlocked(input, WELCOME_AUDIO_UI_ATTESTED_SOURCE_BLOCKER.PRIVATE_UTF8);
    }

    const extraRoot: any = inputFixture();
    extraRoot.extra = "synthetic";
    assertBlocked(extraRoot, WELCOME_AUDIO_UI_ATTESTED_SOURCE_BLOCKER.INPUT_SCHEMA);
  });

  test("P1 rejects proxies, accessors, functions, and revoked proxies without invoking them", () => {
    let trapCount = 0;
    const proxy = new Proxy(inputFixture(), {
      ownKeys() {
        trapCount += 1;
        throw new Error("must not run");
      },
    });
    expect(() => adapt(proxy)).not.toThrow();
    expect(adapt(proxy).private_projection).toBeNull();
    expect(trapCount).toBe(0);

    let getterCount = 0;
    const accessor: any = inputFixture();
    Object.defineProperty(accessor, "mission_id", {
      enumerable: true,
      get() {
        getterCount += 1;
        return "synthetic_getter_mission";
      },
    });
    expect(adapt(accessor).private_projection).toBeNull();
    expect(getterCount).toBe(0);

    const nestedProxy: any = inputFixture();
    nestedProxy.profile = new Proxy(nestedProxy.profile, {
      get() {
        trapCount += 1;
        throw new Error("must not run");
      },
    });
    expect(adapt(nestedProxy).private_projection).toBeNull();
    expect(trapCount).toBe(0);

    const functionValue: any = inputFixture();
    functionValue.profile = () => null;
    expect(adapt(functionValue).private_projection).toBeNull();

    const revoked = Proxy.revocable(inputFixture(), {});
    revoked.revoke();
    expect(() => adapt(revoked.proxy)).not.toThrow();
    expect(adapt(revoked.proxy).private_projection).toBeNull();

    const hostileOptions = new Proxy({ nowMs: NOW_MS }, {
      ownKeys() {
        trapCount += 1;
        throw new Error("must not run");
      },
    });
    expect(() => adaptWelcomeAudioUiAttestedFollowerSource(
      inputFixture(),
      hostileOptions,
    )).not.toThrow();
    expect(adaptWelcomeAudioUiAttestedFollowerSource(
      inputFixture(),
      hostileOptions,
    ).private_projection).toBeNull();
    expect(trapCount).toBe(0);
  });

  test("P1 projection validator rejects tampering and hostile objects as a total function", () => {
    const projection = adapt(inputFixture()).private_projection!;
    const tamperedAnchor = structuredClone(projection);
    tamperedAnchor.anchors.thread_anchor_sha256 = "0".repeat(64);
    expect(validateWelcomeAudioUiAttestedFollowerSourceProjection(
      tamperedAnchor,
      { nowMs: NOW_MS },
    )).toEqual({
      ok: false,
      reason: WELCOME_AUDIO_UI_ATTESTED_SOURCE_BLOCKER.PROJECTION_CONTRACT,
    });

    const tamperedDigest = structuredClone(projection);
    tamperedDigest.source_evidence_sha256 = "f".repeat(64);
    expect(validateWelcomeAudioUiAttestedFollowerSourceProjection(
      tamperedDigest,
      { nowMs: NOW_MS },
    ).ok).toBe(false);

    const extra: any = structuredClone(projection);
    extra.followed_at = "2026-07-16T14:00:00.000Z";
    expect(validateWelcomeAudioUiAttestedFollowerSourceProjection(
      extra,
      { nowMs: NOW_MS },
    ).ok).toBe(false);

    let trapCount = 0;
    const proxy = new Proxy(projection, {
      ownKeys() {
        trapCount += 1;
        throw new Error("must not run");
      },
    });
    expect(() => validateWelcomeAudioUiAttestedFollowerSourceProjection(
      proxy,
      { nowMs: NOW_MS },
    )).not.toThrow();
    expect(validateWelcomeAudioUiAttestedFollowerSourceProjection(
      proxy,
      { nowMs: NOW_MS },
    ).ok).toBe(false);
    expect(trapCount).toBe(0);

    const nested = structuredClone(projection);
    nested.anchors = new Proxy(nested.anchors, {
      ownKeys() {
        trapCount += 1;
        throw new Error("must not run");
      },
    });
    expect(() => validateWelcomeAudioUiAttestedFollowerSourceProjection(
      nested,
      { nowMs: NOW_MS },
    )).not.toThrow();
    expect(validateWelcomeAudioUiAttestedFollowerSourceProjection(
      nested,
      { nowMs: NOW_MS },
    ).ok).toBe(false);

    const hostileOptions = new Proxy({ nowMs: NOW_MS }, {
      ownKeys() {
        trapCount += 1;
        throw new Error("must not run");
      },
    });
    expect(() => validateWelcomeAudioUiAttestedFollowerSourceProjection(
      projection,
      hostileOptions,
    )).not.toThrow();
    expect(validateWelcomeAudioUiAttestedFollowerSourceProjection(
      projection,
      hostileOptions,
    ).ok).toBe(false);

    let getterCount = 0;
    const accessorProjection: any = structuredClone(projection);
    Object.defineProperty(accessorProjection, "source_class", {
      enumerable: true,
      get() {
        getterCount += 1;
        return WELCOME_AUDIO_UI_ATTESTED_SOURCE_CLASS;
      },
    });
    expect(() => validateWelcomeAudioUiAttestedFollowerSourceProjection(
      accessorProjection,
      { nowMs: NOW_MS },
    )).not.toThrow();
    expect(validateWelcomeAudioUiAttestedFollowerSourceProjection(
      accessorProjection,
      { nowMs: NOW_MS },
    ).ok).toBe(false);
    expect(trapCount).toBe(0);
    expect(getterCount).toBe(0);
  });

  test("P1 receipt exposes no private values, times, buckets, anchors, or digests", () => {
    const input = inputFixture();
    const result = adapt(input);
    const receiptJson = JSON.stringify(result.redacted_receipt);
    const privateValues = [
      input.notification_row.exact_target_utf8,
      input.notification_row.time_bucket_utf8,
      input.notification_row.attested_at,
      input.profile.attested_at,
      input.thread.bound_thread_reference_utf8,
      input.thread.attested_at,
      input.owner.owner_account_reference_utf8,
      input.owner.attested_at,
      input.dedupe.checked_at,
      input.mission_id,
      result.private_projection!.source_evidence_sha256,
      ...Object.values(result.private_projection!.anchors),
    ];
    for (const value of privateValues) expect(receiptJson).not.toContain(value);
    expect(receiptJson).not.toContain("/Users/");
    expect(Object.keys(result.redacted_receipt)).toEqual(
      [...WELCOME_AUDIO_UI_ATTESTED_SOURCE_RECEIPT_FIELDS],
    );
  });

  test("P2 receipt validator rejects semantic tampering and hostile values", () => {
    const receipt = adapt(inputFixture()).redacted_receipt;
    const tampered: any = structuredClone(receipt);
    tampered.send_allowed = true;
    expect(validateWelcomeAudioUiAttestedFollowerSourceReceipt(tampered)).toEqual({
      ok: false,
      reason: WELCOME_AUDIO_UI_ATTESTED_SOURCE_BLOCKER.RECEIPT_CONTRACT,
    });

    const leaked: any = structuredClone(receipt);
    leaked.private_value = "synthetic-secret";
    expect(validateWelcomeAudioUiAttestedFollowerSourceReceipt(leaked).ok).toBe(false);

    let trapCount = 0;
    const proxy = new Proxy(receipt, {
      ownKeys() {
        trapCount += 1;
        throw new Error("must not run");
      },
    });
    expect(() => validateWelcomeAudioUiAttestedFollowerSourceReceipt(proxy)).not.toThrow();
    expect(validateWelcomeAudioUiAttestedFollowerSourceReceipt(proxy).ok).toBe(false);
    expect(trapCount).toBe(0);

    const nestedArrayProxy: any = structuredClone(receipt);
    nestedArrayProxy.blocker_codes = new Proxy([], {
      get() {
        trapCount += 1;
        throw new Error("must not run");
      },
      ownKeys() {
        trapCount += 1;
        throw new Error("must not run");
      },
    });
    expect(() => validateWelcomeAudioUiAttestedFollowerSourceReceipt(
      nestedArrayProxy,
    )).not.toThrow();
    expect(validateWelcomeAudioUiAttestedFollowerSourceReceipt(
      nestedArrayProxy,
    ).ok).toBe(false);

    let getterCount = 0;
    const accessorReceipt: any = structuredClone(receipt);
    Object.defineProperty(accessorReceipt, "decision", {
      enumerable: true,
      get() {
        getterCount += 1;
        return WELCOME_AUDIO_UI_ATTESTED_SOURCE_DECISION.READY;
      },
    });
    expect(() => validateWelcomeAudioUiAttestedFollowerSourceReceipt(
      accessorReceipt,
    )).not.toThrow();
    expect(validateWelcomeAudioUiAttestedFollowerSourceReceipt(
      accessorReceipt,
    ).ok).toBe(false);

    const accessorArrayReceipt: any = structuredClone(receipt);
    const accessorArray: any[] = [];
    Object.defineProperty(accessorArray, "0", {
      enumerable: true,
      configurable: true,
      get() {
        getterCount += 1;
        return WELCOME_AUDIO_UI_ATTESTED_SOURCE_BLOCKER.RECEIPT_CONTRACT;
      },
    });
    accessorArrayReceipt.blocker_codes = accessorArray;
    expect(() => validateWelcomeAudioUiAttestedFollowerSourceReceipt(
      accessorArrayReceipt,
    )).not.toThrow();
    expect(validateWelcomeAudioUiAttestedFollowerSourceReceipt(
      accessorArrayReceipt,
    ).ok).toBe(false);
    expect(trapCount).toBe(0);
    expect(getterCount).toBe(0);
  });

  test("P2 exports one exact data-only surface with no browser, fs, env, or network import", () => {
    expect(Object.keys(adapterModule).sort()).toEqual([
      "WELCOME_AUDIO_UI_ATTESTED_RELATIONSHIP_EVIDENCE",
      "WELCOME_AUDIO_UI_ATTESTED_RELATIONSHIP_STATE",
      "WELCOME_AUDIO_UI_ATTESTED_SOURCE_ADAPTER_CONTRACT_VERSION",
      "WELCOME_AUDIO_UI_ATTESTED_SOURCE_BLOCKER",
      "WELCOME_AUDIO_UI_ATTESTED_SOURCE_CLASS",
      "WELCOME_AUDIO_UI_ATTESTED_SOURCE_DECISION",
      "WELCOME_AUDIO_UI_ATTESTED_SOURCE_FRESHNESS_MS",
      "WELCOME_AUDIO_UI_ATTESTED_SOURCE_INPUT_SCHEMA_VERSION",
      "WELCOME_AUDIO_UI_ATTESTED_SOURCE_MAX_RECORDS",
      "WELCOME_AUDIO_UI_ATTESTED_SOURCE_PROJECTION_SCHEMA_VERSION",
      "WELCOME_AUDIO_UI_ATTESTED_SOURCE_RECEIPT_FIELDS",
      "WELCOME_AUDIO_UI_ATTESTED_SOURCE_RECEIPT_SCHEMA_VERSION",
      "adaptWelcomeAudioUiAttestedFollowerSource",
      "validateWelcomeAudioUiAttestedFollowerSourceProjection",
      "validateWelcomeAudioUiAttestedFollowerSourceReceipt",
    ]);

    const modulePath = fileURLToPath(new URL(
      "../scripts/crm-vnext-instagram-welcome-audio-ui-attested-follower-source-adapter.mjs",
      import.meta.url,
    ));
    const source = readFileSync(modulePath, "utf8");
    const imports = [...source.matchAll(/from\s+['\"]([^'\"]+)['\"]/g)]
      .map((match) => match[1]);
    expect(imports).toEqual(["node:crypto", "node:util"]);
    expect(source).not.toMatch(/\bfetch\s*\(/);
    expect(source).not.toMatch(/\bprocess\.env\b/);
    expect(source).not.toMatch(/\b(?:readFile|writeFile|openSync|createWriteStream)\s*\(/);
    expect(source).not.toMatch(/from\s+['\"]node:(?:fs|http|https|net|tls|child_process)['\"]/);
  });
});
