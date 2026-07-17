import { describe, expect, test } from "vitest";

import {
  WELCOME_AUDIO_UI_ATTESTED_RELATIONSHIP_EVIDENCE,
  WELCOME_AUDIO_UI_ATTESTED_RELATIONSHIP_STATE,
  WELCOME_AUDIO_UI_ATTESTED_SOURCE_CLASS,
  WELCOME_AUDIO_UI_ATTESTED_SOURCE_INPUT_SCHEMA_VERSION,
} from "../scripts/crm-vnext-instagram-welcome-audio-ui-attested-follower-source-adapter.mjs";
import * as materializer from "../scripts/crm-vnext-instagram-welcome-audio-ui-attested-canary-packet-materializer.mjs";

const NOW_MS = Date.parse("2026-07-16T15:00:00.000Z");
const MATERIALIZER_MISSION_ID = "synthetic_ui_attested_materializer_mission_001";
const SOURCE_MISSION_ID = "synthetic_ui_attested_source_mission_001";
const PRIVATE_TARGET = "Synthetic.Exact+Tag_é";
const PRIVATE_THREAD = "synthetic-thread-reference/Exact+Case";
const PRIVATE_OWNER = "synthetic-owner-reference/Exact+Case";
const AUDIO_SHA = "a".repeat(64);

const sourceInput = () => ({
  schema_version: WELCOME_AUDIO_UI_ATTESTED_SOURCE_INPUT_SCHEMA_VERSION,
  source_class: WELCOME_AUDIO_UI_ATTESTED_SOURCE_CLASS,
  mission_id: SOURCE_MISSION_ID,
  notification_row: {
    row_ordinal: 1,
    exact_target_utf8: PRIVATE_TARGET,
    notification_evidence: "explicit_recent_follower_notification_row",
    follower_signal: "started_following_owner",
    time_bucket_utf8: "synthetic visible bucket 2 d",
    time_bucket_evidence: "explicit_visible_relative_time_label",
    attested_at: "2026-07-16T14:59:00.000Z",
    inference_status: "explicit_not_inferred",
  },
  profile: {
    exact_target_utf8: PRIVATE_TARGET,
    notification_to_profile_binding: "exact",
    profile_identity_evidence: "exact_private_visual_profile_identity",
    follows_owner: "confirmed",
    follows_owner_evidence: "explicit_visible_follows_owner_signal",
    attested_at: "2026-07-16T14:59:10.000Z",
    inference_status: "explicit_not_inferred",
  },
  thread: {
    bound_thread_reference_utf8: PRIVATE_THREAD,
    profile_to_thread_binding: "exact",
    thread_binding_evidence: "exact_bound_thread_observed",
    attested_at: "2026-07-16T14:59:20.000Z",
    inference_status: "explicit_not_inferred",
  },
  owner: {
    owner_account_reference_utf8: PRIVATE_OWNER,
    owner_binding_evidence: "exact_owner_account_observed",
    attested_at: "2026-07-16T14:59:30.000Z",
    inference_status: "explicit_not_inferred",
  },
  dedupe: {
    status: "clear_no_prior_welcome_or_attempt",
    already_welcomed_status: "not_found",
    send_history_status: "no_prior_attempt",
    exact_target_utf8: PRIVATE_TARGET,
    bound_thread_reference_utf8: PRIVATE_THREAD,
    owner_account_reference_utf8: PRIVATE_OWNER,
    checked_at: "2026-07-16T14:59:40.000Z",
    dedupe_evidence: "exact_bound_thread_history_observed",
    inference_status: "explicit_not_inferred",
  },
  exact_follow_timestamp_claimed: false,
  provider_event_id_claimed: false,
  campaign_membership_claimed: false,
});

const request = () => ({
  schema_version: materializer.WELCOME_AUDIO_UI_ATTESTED_CANARY_REQUEST_SCHEMA_VERSION,
  status: "approved_for_no_live_materialization_only",
  mission_id: MATERIALIZER_MISSION_ID,
  contract_version: "synthetic_no_live_materialization_contract_v1",
  central_repo_head: "b".repeat(40),
  authorization_id: "synthetic_no_live_authorization_001",
  expected_source_mission_id: SOURCE_MISSION_ID,
  candidate_cap: 1,
  future_attempt_cap: 1,
  approved_audio_asset_id: "synthetic_approved_audio_asset_001",
  approved_audio_sha256: AUDIO_SHA,
  approved_audio_binding_evidence: "exact_approved_audio_binding_revalidated",
  execution_approval_authorized: false,
  external_effect_authorized: false,
});

const run = (input = sourceInput(), packetRequest = request(), nowMs = NOW_MS) => (
  materializer.materializeWelcomeAudioUiAttestedCanaryPacketDraft({
    ui_attested_input: input,
    packet_request: packetRequest,
    now_ms: nowMs,
  })
);

describe("UI-attested canary packet materializer", () => {
  test("prepares one deterministic non-live draft and aggregate receipt", () => {
    const first = run();
    const second = run();
    expect(first.private_draft).not.toBeNull();
    expect(first.private_draft).toEqual(second.private_draft);
    expect(Object.isFrozen(first.private_draft)).toBe(true);
    expect(Object.isFrozen(first.private_draft.source_projection)).toBe(true);
    expect(Object.isFrozen(first.private_draft.source_projection.notification_row)).toBe(true);
    expect(first.redacted_receipt.decision).toBe(
      materializer.WELCOME_AUDIO_UI_ATTESTED_CANARY_DECISION.PREPARED,
    );
    expect(first.redacted_receipt).toMatchObject({
      candidate_count: 1,
      candidate_cap: 1,
      canary_ready: false,
      production_ready: false,
      execution_approval_published: false,
      registry_written: false,
      claim_issued: false,
      pending_effect_recorded: false,
      send_allowed: false,
      live_authority: false,
      browser_used: false,
      network_used: false,
      external_effect_invoked: false,
    });
    expect(first.private_draft.source_projection).toMatchObject({
      exact_follow_timestamp_claimed: false,
      provider_event_id_claimed: false,
      campaign_membership_claimed: false,
    });
    expect(materializer.validateWelcomeAudioUiAttestedCanaryPacketDraft(
      first.private_draft,
      { now_ms: NOW_MS },
    )).toEqual({ ok: true, reason: null });
    expect(materializer.validateWelcomeAudioUiAttestedCanaryPacketReceipt(
      first.redacted_receipt,
    )).toEqual({ ok: true, reason: null });
  });

  test("prepares the same inert draft for bounded recent-event relationship evidence", () => {
    const input = sourceInput();
    input.notification_row.time_bucket_utf8 = "3 d";
    input.profile.follows_owner = WELCOME_AUDIO_UI_ATTESTED_RELATIONSHIP_STATE
      .RECENT_FOLLOW_EVENT_NO_EXPLICIT_CONTRADICTION;
    input.profile.follows_owner_evidence = WELCOME_AUDIO_UI_ATTESTED_RELATIONSHIP_EVIDENCE
      .RECENT_EVENT_VISIBLE_3_TO_7_DAY_PILOT_BUCKET;

    const result = run(input);
    expect(result.private_draft).not.toBeNull();
    expect(result.redacted_receipt.decision).toBe(
      materializer.WELCOME_AUDIO_UI_ATTESTED_CANARY_DECISION.PREPARED,
    );
    expect(result.private_draft!.source_projection.profile).toMatchObject({
      follows_owner: WELCOME_AUDIO_UI_ATTESTED_RELATIONSHIP_STATE
        .RECENT_FOLLOW_EVENT_NO_EXPLICIT_CONTRADICTION,
      follows_owner_evidence: WELCOME_AUDIO_UI_ATTESTED_RELATIONSHIP_EVIDENCE
        .RECENT_EVENT_VISIBLE_3_TO_7_DAY_PILOT_BUCKET,
    });
    expect(materializer.validateWelcomeAudioUiAttestedCanaryPacketDraft(
      result.private_draft,
      { now_ms: NOW_MS },
    )).toEqual({ ok: true, reason: null });
  });

  test.each([
    ["candidate cap", { candidate_cap: 2 }],
    ["future attempt cap", { future_attempt_cap: 2 }],
    ["live authority", { execution_approval_authorized: true }],
    ["external effect", { external_effect_authorized: true }],
    ["audio binding", { approved_audio_sha256: "not-a-digest" }],
  ])("blocks invalid request: %s", (_label, change) => {
    const result = run(sourceInput(), { ...request(), ...change });
    expect(result.private_draft).toBeNull();
    expect(result.redacted_receipt.decision).toBe(
      materializer.WELCOME_AUDIO_UI_ATTESTED_CANARY_DECISION.BLOCKED,
    );
    expect(materializer.validateWelcomeAudioUiAttestedCanaryPacketReceipt(
      result.redacted_receipt,
    )).toEqual({ ok: true, reason: null });
  });

  test("blocks stale, future, ambiguous, or cross-mission source evidence", () => {
    const future = sourceInput();
    future.notification_row.attested_at = "2026-07-16T15:01:00.000Z";
    expect(run(future).private_draft).toBeNull();

    const inferred = sourceInput();
    inferred.notification_row.inference_status = "inferred";
    expect(run(inferred).private_draft).toBeNull();

    const mismatchedRequest = request();
    mismatchedRequest.expected_source_mission_id = "different_source_mission_001";
    expect(run(sourceInput(), mismatchedRequest).private_draft).toBeNull();
  });

  test("preserves caller-declared provenance structurally without authenticating it", () => {
    const alternate = {
      ...request(),
      mission_id: "alternate_declared_materializer_mission_001",
      contract_version: "alternate_declared_contract_version_001",
      central_repo_head: "c".repeat(40),
      authorization_id: "alternate_declared_authorization_001",
      approved_audio_asset_id: "alternate_declared_audio_asset_001",
      approved_audio_sha256: "d".repeat(64),
    };
    const result = run(sourceInput(), alternate);
    expect(result.private_draft).toMatchObject({
      mission_id: alternate.mission_id,
      contract_version: alternate.contract_version,
      central_repo_head: alternate.central_repo_head,
      authorization_id: alternate.authorization_id,
      approved_audio_asset_id: alternate.approved_audio_asset_id,
      approved_audio_sha256: alternate.approved_audio_sha256,
      live_authority: false,
      send_allowed: false,
    });
  });

  test("rejects extra root fields and accessors without executing them", () => {
    let getterCalled = false;
    const hostile = {
      ui_attested_input: sourceInput(),
      packet_request: request(),
      now_ms: NOW_MS,
      extra: true,
    };
    Object.defineProperty(hostile, "packet_request", {
      enumerable: true,
      get() {
        getterCalled = true;
        return request();
      },
    });
    const result = materializer.materializeWelcomeAudioUiAttestedCanaryPacketDraft(hostile);
    expect(result.private_draft).toBeNull();
    expect(getterCalled).toBe(false);
  });

  test("rejects symbol fields and coercion objects without executing coercion", () => {
    const withSymbol = {
      ui_attested_input: sourceInput(),
      packet_request: request(),
      now_ms: NOW_MS,
      [Symbol("extra")]: true,
    };
    expect(materializer.materializeWelcomeAudioUiAttestedCanaryPacketDraft(
      withSymbol,
    ).private_draft).toBeNull();

    let coercionCalled = false;
    const coercion = {
      [Symbol.toPrimitive]() {
        coercionCalled = true;
        return "b".repeat(40);
      },
    };
    const hostileRequest = request();
    hostileRequest.central_repo_head = coercion as unknown as string;
    expect(run(sourceInput(), hostileRequest).private_draft).toBeNull();
    expect(coercionCalled).toBe(false);

    const symbolSource = sourceInput();
    Object.defineProperty(symbolSource.notification_row, Symbol("extra"), {
      value: true,
    });
    expect(run(symbolSource).private_draft).toBeNull();
  });

  test("rejects tampered draft and promoted source claims", () => {
    const prepared = run().private_draft;
    expect(prepared).not.toBeNull();
    const tamperedOperation = structuredClone(prepared);
    tamperedOperation.operation_id = "ui_attested_canary_draft_" + "0".repeat(64);
    expect(materializer.validateWelcomeAudioUiAttestedCanaryPacketDraft(
      tamperedOperation,
      { now_ms: NOW_MS },
    ).ok).toBe(false);

    const promoted = structuredClone(prepared);
    promoted.source_projection.exact_follow_timestamp_claimed = true;
    expect(materializer.validateWelcomeAudioUiAttestedCanaryPacketDraft(
      promoted,
      { now_ms: NOW_MS },
    ).ok).toBe(false);
  });

  test("draft validation rejects nested Proxy and options getter without traps", () => {
    const prepared = structuredClone(run().private_draft);
    let proxyTrapCalled = false;
    prepared.source_projection = new Proxy(prepared.source_projection, {
      get() {
        proxyTrapCalled = true;
        throw new Error("projection trap must not run");
      },
    });
    expect(materializer.validateWelcomeAudioUiAttestedCanaryPacketDraft(
      prepared,
      { now_ms: NOW_MS },
    ).ok).toBe(false);
    expect(proxyTrapCalled).toBe(false);

    let optionsGetterCalled = false;
    const hostileOptions = {} as { now_ms: number };
    Object.defineProperty(hostileOptions, "now_ms", {
      enumerable: true,
      get() {
        optionsGetterCalled = true;
        return NOW_MS;
      },
    });
    expect(materializer.validateWelcomeAudioUiAttestedCanaryPacketDraft(
      run().private_draft,
      hostileOptions,
    ).ok).toBe(false);
    expect(optionsGetterCalled).toBe(false);
  });

  test("draft validation rejects authorization coercion without executing it", () => {
    const prepared = structuredClone(run().private_draft);
    let coercionCalled = false;
    prepared.authorization_id = {
      [Symbol.toPrimitive]() {
        coercionCalled = true;
        return "synthetic_no_live_authorization_001";
      },
    } as unknown as string;
    expect(materializer.validateWelcomeAudioUiAttestedCanaryPacketDraft(
      prepared,
      { now_ms: NOW_MS },
    ).ok).toBe(false);
    expect(coercionCalled).toBe(false);
  });

  test("receipt never exposes private source or audio bindings", () => {
    const result = run();
    const receiptText = JSON.stringify(result.redacted_receipt);
    for (const forbidden of [PRIVATE_TARGET, PRIVATE_THREAD, PRIVATE_OWNER, AUDIO_SHA]) {
      expect(receiptText).not.toContain(forbidden);
    }
  });

  test("receipt validation rejects accessor and Proxy blocker arrays without invoking accessors", () => {
    const receipt = structuredClone(run().redacted_receipt);
    let getterCalled = false;
    Object.defineProperty(receipt.blocker_codes, "0", {
      configurable: true,
      enumerable: true,
      get() {
        getterCalled = true;
        return materializer.WELCOME_AUDIO_UI_ATTESTED_CANARY_BLOCKER.INPUT_SCHEMA;
      },
    });
    receipt.blocker_codes.length = 1;
    expect(materializer.validateWelcomeAudioUiAttestedCanaryPacketReceipt(receipt).ok).toBe(false);
    expect(getterCalled).toBe(false);

    const proxied = structuredClone(run().redacted_receipt);
    proxied.blocker_codes = new Proxy([], {
      get() {
        throw new Error("proxy trap must not run");
      },
    });
    expect(materializer.validateWelcomeAudioUiAttestedCanaryPacketReceipt(proxied).ok).toBe(false);
  });

  test("exports only the closed materializer surface", () => {
    expect(Object.keys(materializer).sort()).toEqual([
      "WELCOME_AUDIO_UI_ATTESTED_CANARY_BLOCKER",
      "WELCOME_AUDIO_UI_ATTESTED_CANARY_CANDIDATE_CAP",
      "WELCOME_AUDIO_UI_ATTESTED_CANARY_DECISION",
      "WELCOME_AUDIO_UI_ATTESTED_CANARY_DRAFT_SCHEMA_VERSION",
      "WELCOME_AUDIO_UI_ATTESTED_CANARY_MATERIALIZER_CONTRACT_VERSION",
      "WELCOME_AUDIO_UI_ATTESTED_CANARY_RECEIPT_SCHEMA_VERSION",
      "WELCOME_AUDIO_UI_ATTESTED_CANARY_REQUEST_SCHEMA_VERSION",
      "materializeWelcomeAudioUiAttestedCanaryPacketDraft",
      "validateWelcomeAudioUiAttestedCanaryPacketDraft",
      "validateWelcomeAudioUiAttestedCanaryPacketReceipt",
    ].sort());
  });
});
