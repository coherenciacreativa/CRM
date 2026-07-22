import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  chmod,
  link,
  lstat,
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  symlink,
  unlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, test, vi } from "vitest";

import {
  confirmWelcomeAudioNativeNotificationProfileBindingForTest,
  prepareWelcomeAudioNativeNotificationProfileBindingForTest,
} from "../scripts/crm-vnext-instagram-welcome-audio-native-notification-profile-binder.mjs";
import * as sourceArtifact from "../scripts/crm-vnext-instagram-welcome-audio-ui-attested-follower-source-artifact-materializer.mjs";
import {
  WELCOME_AUDIO_UI_ATTESTED_SOURCE_CLASS,
  adaptWelcomeAudioUiAttestedFollowerSource,
} from "../scripts/crm-vnext-instagram-welcome-audio-ui-attested-follower-source-adapter.mjs";
import * as canaryMaterializer from "../scripts/crm-vnext-instagram-welcome-audio-ui-attested-canary-packet-materializer.mjs";
import {
  WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST,
  WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_QUALIFICATION_SCENARIO_FOR_TEST,
  installWelcomeAudioIabSemanticRuntimeFacadeForTest,
  observeWelcomeAudioIabSemanticFollowerCandidateOnceForTest,
  resetWelcomeAudioIabSemanticRuntimeFacadeForTest,
} from "../scripts/crm-vnext-instagram-welcome-audio-iab-semantic-follower-source-host.mjs";

const NOW_MS = Date.parse("2026-07-17T15:00:00.000Z");
const PRIVATE_TARGET = "Synthetic.Exact_Tag";
const PRIVATE_THREAD = "synthetic-thread-reference/Exact+Case";
const PRIVATE_OWNER = "synthetic-owner-reference/Exact+Case";
const roots: string[] = [];

const makeRoot = async () => {
  const root = await mkdtemp(join(
    tmpdir(),
    sourceArtifact.WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_SYNTHETIC_PREFIX,
  ));
  await chmod(root, 0o700);
  roots.push(root);
  return root;
};

afterEach(async () => {
  vi.useRealTimers();
  resetWelcomeAudioIabSemanticRuntimeFacadeForTest();
  await Promise.all(roots.splice(0).map((root) => rm(root, {
    recursive: true,
    force: true,
  })));
});

const makeV3Root = async () => {
  const root = await mkdtemp(join(
    tmpdir(),
    sourceArtifact.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_SYNTHETIC_PREFIX_V3,
  ));
  await chmod(root, 0o700);
  roots.push(root);
  return root;
};

const completeSourceCapability = async () => {
  const nowMs = Date.now();
  expect(installWelcomeAudioIabSemanticRuntimeFacadeForTest({
    qualification_scenario:
      WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_QUALIFICATION_SCENARIO_FOR_TEST.EXACT_TWO_PAIRS,
    observation_scenario:
      WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST.EXACT_CANDIDATE,
    finalize_scenario: "exact",
  })).toBe(true);
  const observed = await observeWelcomeAudioIabSemanticFollowerCandidateOnceForTest({
    now_ms: nowMs,
  });
  expect(observed.private_complete_source_capability).not.toBeNull();
  expect(resetWelcomeAudioIabSemanticRuntimeFacadeForTest()).toBe(true);
  return {
    nowMs,
    capability: observed.private_complete_source_capability,
  };
};

const realignV3DerivedEvidence = (artifactInput: unknown, nowMs: number) => {
  const artifact: any = structuredClone(artifactInput);
  const completeSource = artifact.complete_source;
  artifact.ui_attested_input.notification_row.exact_target_utf8 =
    completeSource.exact_target_utf8;
  artifact.ui_attested_input.notification_row.time_bucket_utf8 =
    completeSource.visible_time_bucket_utf8;
  artifact.ui_attested_input.profile.exact_target_utf8 = completeSource.exact_target_utf8;
  artifact.ui_attested_input.thread.bound_thread_reference_utf8 =
    completeSource.exact_thread_reference;
  artifact.ui_attested_input.owner.owner_account_reference_utf8 =
    completeSource.exact_owner_account_reference;
  artifact.ui_attested_input.dedupe.exact_target_utf8 = completeSource.exact_target_utf8;
  artifact.ui_attested_input.dedupe.bound_thread_reference_utf8 =
    completeSource.exact_thread_reference;
  artifact.ui_attested_input.dedupe.owner_account_reference_utf8 =
    completeSource.exact_owner_account_reference;
  const adapted = adaptWelcomeAudioUiAttestedFollowerSource(
    artifact.ui_attested_input,
    { nowMs },
  );
  expect(adapted.private_projection).not.toBeNull();
  artifact.source_evidence_sha256 = adapted.private_projection!.source_evidence_sha256;
  return artifact;
};

const safariTabs = (sourceLabel: string) => [
  `application "${sourceLabel}"`,
  "  1 tab group description: Safari tabs, value: tab-group?isSeparate=false",
  `    4 tab ${sourceLabel}, value: ${sourceLabel}, tab?isPinned=false&isNarrow=false&isActive=true`,
  "    6 tab Neutral UI Preflight, value: Neutral UI Preflight, tab?isPinned=false&isNarrow=false&isActive=false",
  "  10 toolbar Safari toolbar",
];

const nativeBindingCapability = ({
  target = PRIVATE_TARGET,
  visibleTimeBucket = "4 d",
  rowOrdinal = 1,
  notificationAtMs = Date.parse("2026-07-17T14:59:00.000Z"),
  profileAtMs = Date.parse("2026-07-17T14:59:10.000Z"),
} = {}) => {
  const nativeProfileReference = `https://www.instagram.com/${target}/`;
  const notificationState = [
    ...safariTabs("Instagram"),
    "    12 text field (settable, string) Description: smart search field, Value: https://www.instagram.com/, ID: WEB_BROWSER_ADDRESS_AND_SEARCH_FIELD",
    "  20 group Instagram HTML content",
    "    21 heading Notifications",
    "    30 group Notifications list",
    "      31 group follower notification row",
    `        32 link ${target}, URL: ${nativeProfileReference}`,
    `        33 text started following you. ${visibleTimeBucket}`,
    "        34 button Follow",
  ].join("\n");
  const prepared = prepareWelcomeAudioNativeNotificationProfileBindingForTest({
    raw_text: notificationState,
    row_ordinal: rowOrdinal,
    now_ms: notificationAtMs,
  });
  if (!prepared.private_activation_capability) {
    throw new Error("synthetic native notification binding preparation failed");
  }
  const profileState = [
    ...safariTabs(target),
    `    12 text field (settable, string) Description: smart search field, Value: ${nativeProfileReference}, ID: WEB_BROWSER_ADDRESS_AND_SEARCH_FIELD`,
    "  20 group Instagram HTML content",
    "    39 group Profile header",
    `      40 heading ${target}`,
  ].join("\n");
  const confirmed = confirmWelcomeAudioNativeNotificationProfileBindingForTest({
    private_activation_capability: prepared.private_activation_capability,
    raw_text: profileState,
    now_ms: profileAtMs,
  });
  if (!confirmed.private_binding_capability) {
    throw new Error("synthetic native profile binding confirmation failed");
  }
  return confirmed.private_binding_capability;
};

const observation = ({
  target = PRIVATE_TARGET,
  visibleTimeBucket = "4 d",
  rowOrdinal = 1,
} = {}) => ({
  schema_version:
    sourceArtifact.WELCOME_AUDIO_UI_ATTESTED_SOURCE_OBSERVATION_SCHEMA_VERSION,
  mission_id: "synthetic_notifications_source_materialization_mission_001",
  row_ordinal: rowOrdinal,
  exact_target_utf8: target,
  visible_time_bucket_utf8: visibleTimeBucket,
  notification_attested_at: "2026-07-17T14:59:00.000Z",
  profile_attested_at: "2026-07-17T14:59:10.000Z",
  thread_attested_at: "2026-07-17T14:59:20.000Z",
  owner_attested_at: "2026-07-17T14:59:30.000Z",
  dedupe_checked_at: "2026-07-17T14:59:40.000Z",
  relationship_mode:
    sourceArtifact.WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_RELATIONSHIP_MODE
      .CURRENT_VISIBLE_FOLLOWS_OWNER,
  bound_thread_reference_utf8: PRIVATE_THREAD,
  owner_account_reference_utf8: PRIVATE_OWNER,
  notification_row_observed: true,
  private_notification_profile_binding_capability: nativeBindingCapability({
    target,
    visibleTimeBucket,
    rowOrdinal,
  }),
  profile_identity_observed_exact: true,
  relationship_evidence_observed_exact: true,
  profile_to_thread_binding_exact: true,
  owner_binding_observed_exact: true,
  no_explicit_relationship_contradiction_observed: true,
  no_prior_welcome_observed: true,
  no_prior_send_attempt_observed: true,
});

const publish = async (
  root: string,
  privateObservation: ReturnType<typeof observation> = observation(),
  nowMs = NOW_MS,
) => sourceArtifact.publishSyntheticWelcomeAudioUiAttestedFollowerSourceArtifactForTest({
  artifact_root: root,
  private_observation: privateObservation,
  now_ms: nowMs,
});

describe("UI-attested follower source artifact materializer", () => {
  test("publishes one exact owner-only artifact and an aggregate-only receipt", async () => {
    const root = await makeRoot();
    const result = await publish(root);

    expect(result.private_artifact).not.toBeNull();
    expect(result.redacted_receipt.decision).toBe(
      sourceArtifact.WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_DECISION.PUBLISHED,
    );
    expect(sourceArtifact.validateWelcomeAudioUiAttestedFollowerSourceArtifactReceipt(
      result.redacted_receipt,
    )).toEqual({ ok: true, reason: null });
    expect(sourceArtifact.validateWelcomeAudioUiAttestedFollowerSourceArtifact(
      result.private_artifact,
      { now_ms: NOW_MS },
    )).toEqual({ ok: true, reason: null });
    expect(result.private_artifact!.ui_attested_input).toMatchObject({
      source_class: WELCOME_AUDIO_UI_ATTESTED_SOURCE_CLASS,
      mission_id: observation().mission_id,
      exact_follow_timestamp_claimed: false,
      provider_event_id_claimed: false,
      campaign_membership_claimed: false,
    });
    expect(result.private_artifact!.ui_attested_input.notification_row.exact_target_utf8)
      .toBe(PRIVATE_TARGET);

    const metadata = await lstat(result.artifact_path!);
    expect(metadata.isFile()).toBe(true);
    expect(metadata.nlink).toBe(1);
    expect(metadata.mode & 0o7777).toBe(0o600);
    expect(await readdir(root)).toEqual([
      sourceArtifact.WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_FILE_NAME,
    ]);
    const persisted = JSON.parse(await readFile(result.artifact_path!, "utf8"));
    expect(persisted).toEqual(result.private_artifact);

    expect(Object.keys(result.redacted_receipt)).toEqual(
      sourceArtifact.WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_RECEIPT_FIELDS,
    );
    const publicReceipt = JSON.stringify(result.redacted_receipt);
    expect(publicReceipt).not.toContain(PRIVATE_TARGET);
    expect(publicReceipt).not.toContain(PRIVATE_THREAD);
    expect(publicReceipt).not.toContain(PRIVATE_OWNER);
    expect(publicReceipt).not.toMatch(/2026-|[a-f0-9]{64}|\/Users\//);
    expect(result.redacted_receipt).toMatchObject({
      observation_validated: true,
      ui_attested_input_built: true,
      adapter_ready: true,
      source_evidence_bound: true,
      owner_only_root_verified: true,
      artifact_published: true,
      existing_artifact_reused: false,
      artifact_stability_verified: true,
      artifact_count: 1,
      artifact_cap: 1,
      live_authority: false,
      claim_issued: false,
      pending_effect_recorded: false,
      send_allowed: false,
      browser_used: false,
      network_used: false,
      external_effect_invoked: false,
      blocker_codes: [],
    });
  });

  test("builds and publishes the bounded 3-to-7-day relationship mode", async () => {
    const root = await makeRoot();
    const input = observation({ visibleTimeBucket: "4 días" });
    input.relationship_mode = sourceArtifact
      .WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_RELATIONSHIP_MODE
      .RECENT_FOLLOW_EVENT_NO_EXPLICIT_CONTRADICTION_3_TO_7_DAY_BUCKET;
    const result = await publish(root, input);

    expect(result.private_artifact).not.toBeNull();
    expect(result.private_artifact!.ui_attested_input.profile).toMatchObject({
      follows_owner: "recent_follow_event_no_explicit_contradiction",
      follows_owner_evidence:
        "exact_recent_follow_notification_profile_binding_visible_3_to_7_day_pilot_bucket",
    });
    expect(sourceArtifact.validateWelcomeAudioUiAttestedFollowerSourceArtifact(
      result.private_artifact,
      { now_ms: NOW_MS },
    )).toEqual({ ok: true, reason: null });
  });

  test("preserves exact native handle variants byte-for-byte without normalization", async () => {
    const variants = [
      "Synthetic.Exact_Tag",
      "synthetic.exact_tag",
      "SyntheticExact_Tag",
      "Synthetic.Exact.Tag",
    ];
    const seen: string[] = [];
    for (const exactTarget of variants) {
      const root = await makeRoot();
      const input = observation({ target: exactTarget });
      const result = await publish(root, input);
      expect(result.private_artifact).not.toBeNull();
      seen.push(result.private_artifact!.ui_attested_input.notification_row.exact_target_utf8);
    }
    expect(seen).toEqual(variants);
  });

  test("reuses only a byte-identical stable artifact and blocks conflicts", async () => {
    const root = await makeRoot();
    const first = await publish(root);
    const second = await publish(root);
    expect(first.redacted_receipt.decision).toBe(
      sourceArtifact.WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_DECISION.PUBLISHED,
    );
    expect(second.redacted_receipt).toMatchObject({
      decision: sourceArtifact.WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_DECISION.REUSED,
      artifact_published: false,
      existing_artifact_reused: true,
      artifact_stability_verified: true,
    });

    const changed = observation({ target: "Synthetic.Other_Tag" });
    const conflict = await publish(root, changed);
    expect(conflict.private_artifact).toBeNull();
    expect(conflict.redacted_receipt.blocker_codes).toEqual([
      sourceArtifact.WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_BLOCKER.TARGET_CONFLICT,
    ]);
  });

  test("consumes the native binding capability once and rejects replay", async () => {
    const root = await makeRoot();
    const input = observation();
    const first = await publish(root, input);
    const replay = await publish(root, input);

    expect(first.redacted_receipt.decision).toBe(
      sourceArtifact.WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_DECISION.PUBLISHED,
    );
    expect(replay.private_artifact).toBeNull();
    expect(replay.redacted_receipt.blocker_codes).toContain(
      sourceArtifact.WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_BLOCKER.OBSERVATION_INVALID,
    );
  });

  test("rejects the legacy boolean-only provenance shape", async () => {
    const root = await makeRoot();
    const input = observation() as Record<string, unknown>;
    delete input.private_notification_profile_binding_capability;
    input.notification_to_profile_binding_exact = true;

    const result = await publish(root, input as ReturnType<typeof observation>);
    expect(result.private_artifact).toBeNull();
    expect(result.redacted_receipt.blocker_codes).toEqual([
      sourceArtifact.WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_BLOCKER.OBSERVATION_INVALID,
    ]);
  });

  test("binds receipt publication flags and stability to the exact decision", async () => {
    const root = await makeRoot();
    const published = await publish(root);
    const contradictoryPublished = {
      ...published.redacted_receipt,
      artifact_published: false,
      existing_artifact_reused: true,
    };
    const contradictoryBlocked = {
      ...published.redacted_receipt,
      decision: sourceArtifact.WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_DECISION.BLOCKED,
      artifact_published: false,
      existing_artifact_reused: false,
      artifact_count: 0,
      blocker_codes: [
        sourceArtifact.WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_BLOCKER.INPUT_INVALID,
      ],
    };
    const impossibleInputProgress = {
      ...contradictoryBlocked,
      artifact_stability_verified: false,
    };

    expect(sourceArtifact.validateWelcomeAudioUiAttestedFollowerSourceArtifactReceipt(
      contradictoryPublished,
    ).ok).toBe(false);
    expect(sourceArtifact.validateWelcomeAudioUiAttestedFollowerSourceArtifactReceipt(
      contradictoryBlocked,
    ).ok).toBe(false);
    expect(sourceArtifact.validateWelcomeAudioUiAttestedFollowerSourceArtifactReceipt(
      impossibleInputProgress,
    ).ok).toBe(false);
  });

  test("binds every blocked receipt code to its reachable progress states", async () => {
    const base = sourceArtifact
      .publishSyntheticWelcomeAudioUiAttestedFollowerSourceArtifactForTest({} as never);
    const baseReceipt = (await base).redacted_receipt;
    const progressFields = [
      "observation_validated",
      "ui_attested_input_built",
      "adapter_ready",
      "source_evidence_bound",
      "owner_only_root_verified",
    ] as const;
    const receiptFor = (blocker: string, key: string) => ({
      ...baseReceipt,
      ...Object.fromEntries(progressFields.map((field, index) => [field, key[index] === "1"])),
      blocker_codes: [blocker],
    });
    const matrix = [
      [sourceArtifact.WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_BLOCKER.INPUT_INVALID,
        ["00000"], "11111"],
      [sourceArtifact.WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_BLOCKER.OBSERVATION_INVALID,
        ["00000"], "11000"],
      [sourceArtifact.WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_BLOCKER.BINDING_CAPABILITY_INVALID,
        ["11110"], "00000"],
      [sourceArtifact.WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_BLOCKER.ADAPTER_BLOCKED,
        ["11000"], "11110"],
      [sourceArtifact.WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_BLOCKER.ARTIFACT_INVALID,
        ["11110", "11111"], "00000"],
      [sourceArtifact.WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_BLOCKER.ROOT_INVALID,
        ["11110"], "11111"],
      [sourceArtifact.WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_BLOCKER.TARGET_CONFLICT,
        ["11111"], "11110"],
      [sourceArtifact.WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_BLOCKER.PUBLICATION_FAILED,
        ["00000", "11110", "11111"], "11000"],
    ] as const;

    for (const [blocker, allowedKeys, rejectedKey] of matrix) {
      for (const key of allowedKeys) {
        expect(sourceArtifact.validateWelcomeAudioUiAttestedFollowerSourceArtifactReceipt(
          receiptFor(blocker, key),
        ).ok).toBe(true);
      }
      expect(sourceArtifact.validateWelcomeAudioUiAttestedFollowerSourceArtifactReceipt(
        receiptFor(blocker, rejectedKey),
      ).ok).toBe(false);
    }
  });

  test("rejects a non-string digest without caller-controlled coercion", async () => {
    const root = await makeRoot();
    const published = await publish(root);
    let coerced = false;
    const hostileArtifact = {
      ...published.private_artifact,
      source_evidence_sha256: {
        toString() {
          coerced = true;
          return "a".repeat(64);
        },
      },
    };

    expect(sourceArtifact.validateWelcomeAudioUiAttestedFollowerSourceArtifact(
      hostileArtifact as never,
      { now_ms: NOW_MS },
    ).ok).toBe(false);
    expect(coerced).toBe(false);
  });

  test("rejects a FIFO target without opening it as a blocking reader", async () => {
    const root = await makeRoot();
    const target = join(
      root,
      sourceArtifact.WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_FILE_NAME,
    );
    execFileSync("mkfifo", [target]);

    let timeout: ReturnType<typeof setTimeout> | undefined;
    const result = await Promise.race([
      publish(root),
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => reject(new Error("fifo publication timed out")), 500);
      }),
    ]).finally(() => clearTimeout(timeout));
    expect(result.private_artifact).toBeNull();
    expect(result.redacted_receipt.blocker_codes).toEqual([
      sourceArtifact.WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_BLOCKER.ARTIFACT_INVALID,
    ]);
  });

  test("rejects a directory target as a non-regular artifact", async () => {
    const root = await makeRoot();
    const target = join(
      root,
      sourceArtifact.WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_FILE_NAME,
    );
    await mkdir(target, { mode: 0o700 });

    const result = await publish(root);
    expect(result.private_artifact).toBeNull();
    expect(result.redacted_receipt.blocker_codes).toEqual([
      sourceArtifact.WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_BLOCKER.ARTIFACT_INVALID,
    ]);
  });

  test("settles a strictly shaped valid concurrent module temporary", async () => {
    const root = await makeRoot();
    const temporaryPath = join(
      root,
      `.ui-attested-source-${process.pid}-${"a".repeat(32)}.tmp`,
    );
    await writeFile(temporaryPath, "x", { mode: 0o600 });
    const removal = new Promise<void>((resolvePromise, reject) => {
      setTimeout(() => {
        unlink(temporaryPath).then(() => resolvePromise(), reject);
      }, 25);
    });

    const result = await publish(root);
    await removal;
    expect(result.redacted_receipt.decision).toBe(
      sourceArtifact.WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_DECISION.PUBLISHED,
    );
    expect(await readdir(root)).toEqual([
      sourceArtifact.WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_FILE_NAME,
    ]);
  });

  test("rejects a malformed module-shaped temporary without settling it", async () => {
    const root = await makeRoot();
    const temporaryPath = join(
      root,
      `.ui-attested-source-${process.pid}-${"b".repeat(32)}.tmp`,
    );
    await writeFile(temporaryPath, "x", { mode: 0o644 });

    const result = await publish(root);
    expect(result.redacted_receipt.blocker_codes).toEqual([
      sourceArtifact.WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_BLOCKER.ROOT_INVALID,
    ]);
  });

  test("publishes at most one artifact under a concurrent identical race", async () => {
    const root = await makeRoot();
    const results = await Promise.all([
      publish(root),
      publish(root),
      publish(root),
      publish(root),
    ]);
    expect(results.filter((result) => result.redacted_receipt.decision
      === sourceArtifact.WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_DECISION.PUBLISHED))
      .toHaveLength(1);
    expect(results.filter((result) => result.redacted_receipt.decision
      === sourceArtifact.WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_DECISION.REUSED))
      .toHaveLength(3);
    expect(results.filter((result) => result.redacted_receipt.decision
      === sourceArtifact.WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_DECISION.BLOCKED))
      .toHaveLength(0);
    const finalPath = join(
      root,
      sourceArtifact.WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_FILE_NAME,
    );
    const metadata = await lstat(finalPath);
    expect(metadata.nlink).toBe(1);
    expect(metadata.mode & 0o7777).toBe(0o600);
    expect(await readdir(root)).toEqual([
      sourceArtifact.WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_FILE_NAME,
    ]);
  });

  test("blocks the loser of a concurrent conflicting publication", async () => {
    const root = await makeRoot();
    const changed = ["A", "B", "C"].map((suffix) => {
      return observation({ target: `Synthetic.Other_Tag_${suffix}` });
    });
    const results = await Promise.all([
      publish(root),
      ...changed.map((candidate) => publish(root, candidate)),
    ]);
    const winner = results.find((result) => result.redacted_receipt.decision
      === sourceArtifact.WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_DECISION.PUBLISHED);
    const blocked = results.filter((result) => result.redacted_receipt.decision
      === sourceArtifact.WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_DECISION.BLOCKED);
    expect(winner).toBeDefined();
    expect(blocked).toHaveLength(3);
    expect(blocked.every((result) => result.redacted_receipt.blocker_codes[0]
      === sourceArtifact.WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_BLOCKER.TARGET_CONFLICT))
      .toBe(true);
    const finalPath = join(
      root,
      sourceArtifact.WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_FILE_NAME,
    );
    expect(JSON.parse(await readFile(finalPath, "utf8"))).toEqual(winner?.private_artifact);
    expect(await readdir(root)).toEqual([
      sourceArtifact.WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_FILE_NAME,
    ]);
  });

  test("round-trips into the existing no-live canary packet materializer", async () => {
    const root = await makeRoot();
    const published = await publish(root);
    const request = {
      schema_version:
        canaryMaterializer.WELCOME_AUDIO_UI_ATTESTED_CANARY_REQUEST_SCHEMA_VERSION,
      status: "approved_for_no_live_materialization_only",
      mission_id: "synthetic_downstream_canary_materializer_mission_001",
      contract_version: "synthetic_downstream_contract_v1",
      central_repo_head: "b".repeat(40),
      authorization_id: "synthetic_downstream_authorization_001",
      expected_source_mission_id: observation().mission_id,
      candidate_cap: 1,
      future_attempt_cap: 1,
      approved_audio_asset_id: "synthetic_approved_audio_asset_001",
      approved_audio_sha256: "a".repeat(64),
      approved_audio_binding_evidence: "exact_approved_audio_binding_revalidated",
      execution_approval_authorized: false,
      external_effect_authorized: false,
    };
    const downstream = canaryMaterializer.materializeWelcomeAudioUiAttestedCanaryPacketDraft({
      ui_attested_input: published.private_artifact!.ui_attested_input,
      packet_request: request,
      now_ms: NOW_MS,
    });

    expect(downstream.private_draft).not.toBeNull();
    expect(downstream.redacted_receipt).toMatchObject({
      decision: canaryMaterializer.WELCOME_AUDIO_UI_ATTESTED_CANARY_DECISION.PREPARED,
      candidate_count: 1,
      candidate_cap: 1,
      execution_approval_published: false,
      claim_issued: false,
      send_allowed: false,
      live_authority: false,
      browser_used: false,
      network_used: false,
      external_effect_invoked: false,
    });
  });

  test.each([
    ["ordinal zero", { row_ordinal: 0 }],
    ["ordinal over cap", { row_ordinal: 9 }],
    ["false row evidence", { notification_row_observed: false }],
    ["missing native binding capability", {
      private_notification_profile_binding_capability: null,
    }],
    ["false relationship evidence", { relationship_evidence_observed_exact: false }],
    ["explicit contradiction", { no_explicit_relationship_contradiction_observed: false }],
    ["prior welcome", { no_prior_welcome_observed: false }],
    ["prior attempt", { no_prior_send_attempt_observed: false }],
    ["unsupported relationship mode", { relationship_mode: "unknown" }],
    ["bad bucket for bounded mode", {
      relationship_mode: sourceArtifact
        .WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_RELATIONSHIP_MODE
        .RECENT_FOLLOW_EVENT_NO_EXPLICIT_CONTRADICTION_3_TO_7_DAY_BUCKET,
      visible_time_bucket_utf8: "8 d",
    }],
  ])("blocks invalid observation: %s", async (_label, change) => {
    const root = await makeRoot();
    const result = await publish(root, { ...observation(), ...change } as ReturnType<typeof observation>);
    expect(result.private_artifact).toBeNull();
    expect(result.redacted_receipt.decision).toBe(
      sourceArtifact.WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_DECISION.BLOCKED,
    );
    expect(result.redacted_receipt.artifact_count).toBe(0);
    expect(sourceArtifact.validateWelcomeAudioUiAttestedFollowerSourceArtifactReceipt(
      result.redacted_receipt,
    )).toEqual({ ok: true, reason: null });
  });

  test.each([
    ["stale", { notification_attested_at: "2026-07-17T14:54:59.999Z" }],
    ["future", { dedupe_checked_at: "2026-07-17T15:00:00.001Z" }],
    ["out of order", { thread_attested_at: "2026-07-17T14:59:05.000Z" }],
  ])("blocks %s observation timing", async (_label, change) => {
    const root = await makeRoot();
    const result = await publish(root, { ...observation(), ...change } as ReturnType<typeof observation>);
    expect(result.private_artifact).toBeNull();
    expect(result.redacted_receipt.blocker_codes).toContain(
      sourceArtifact.WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_BLOCKER.OBSERVATION_INVALID,
    );
  });

  test("rejects extra fields, accessors, and proxy observations without executing them", async () => {
    const root = await makeRoot();
    const extra = await publish(root, { ...observation(), extra: true } as never);
    expect(extra.private_artifact).toBeNull();

    let getterCalled = false;
    const accessor = observation();
    Object.defineProperty(accessor, "exact_target_utf8", {
      enumerable: true,
      get() {
        getterCalled = true;
        return PRIVATE_TARGET;
      },
    });
    const accessorResult = await publish(root, accessor);
    expect(accessorResult.private_artifact).toBeNull();
    expect(getterCalled).toBe(false);

    const proxied = new Proxy(observation(), {});
    const proxyResult = await publish(root, proxied);
    expect(proxyResult.private_artifact).toBeNull();
  });

  test("fails closed on wrong root mode, symlink root, extra entry, or hardlinked target", async () => {
    const wrongMode = await makeRoot();
    await chmod(wrongMode, 0o755);
    const wrongModeResult = await publish(wrongMode);
    expect(wrongModeResult.redacted_receipt.blocker_codes).toContain(
      sourceArtifact.WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_BLOCKER.ROOT_INVALID,
    );
    expect(sourceArtifact.validateWelcomeAudioUiAttestedFollowerSourceArtifactReceipt(
      wrongModeResult.redacted_receipt,
    )).toEqual({ ok: true, reason: null });

    const realRoot = await makeRoot();
    const symlinkRoot = join(tmpdir(), `${sourceArtifact
      .WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_SYNTHETIC_PREFIX}symlink-${process.pid}-${randomUUID()}`);
    await symlink(realRoot, symlinkRoot);
    roots.push(symlinkRoot);
    expect((await publish(symlinkRoot)).redacted_receipt.blocker_codes).toContain(
      sourceArtifact.WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_BLOCKER.ROOT_INVALID,
    );

    const extraRoot = await makeRoot();
    await writeFile(join(extraRoot, "unexpected"), "x", { mode: 0o600 });
    expect((await publish(extraRoot)).redacted_receipt.blocker_codes).toContain(
      sourceArtifact.WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_BLOCKER.ROOT_INVALID,
    );

    const hardlinkRoot = await makeRoot();
    const sibling = join(tmpdir(), `${sourceArtifact
      .WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_SYNTHETIC_PREFIX}sibling-${process.pid}-${randomUUID()}`);
    await writeFile(sibling, "{}\n", { mode: 0o600 });
    roots.push(sibling);
    await link(sibling, join(
      hardlinkRoot,
      sourceArtifact.WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_FILE_NAME,
    ));
    const hardlinkResult = await publish(hardlinkRoot);
    expect(hardlinkResult.redacted_receipt.blocker_codes).toContain(
      sourceArtifact.WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_BLOCKER.ARTIFACT_INVALID,
    );
    expect(sourceArtifact.validateWelcomeAudioUiAttestedFollowerSourceArtifactReceipt(
      hardlinkResult.redacted_receipt,
    )).toEqual({ ok: true, reason: null });
  });

  test("keeps import inert and fixed publication caller-controlled", async () => {
    const source = await readFile(
      new URL(
        "../scripts/crm-vnext-instagram-welcome-audio-ui-attested-follower-source-artifact-materializer.mjs",
        import.meta.url,
      ),
      "utf8",
    );
    expect(source).not.toMatch(/await\s+publishFixedWelcomeAudioUiAttestedFollowerSourceArtifact\s*\(/);
    expect(source).not.toMatch(/process\.env|fetch\s*\(|https?:\/\//);
    expect(sourceArtifact.WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_FIXED_ROOT)
      .not.toContain(PRIVATE_TARGET);

    const reuseStart = source.indexOf("const reuseExactArtifact = async");
    const reuseEnd = source.indexOf("const publishArtifactBytesExclusive", reuseStart);
    const reuseImplementation = source.slice(reuseStart, reuseEnd);
    expect(reuseStart).toBeGreaterThan(-1);
    expect(reuseEnd).toBeGreaterThan(reuseStart);
    expect(reuseImplementation.indexOf("await syncAndAssertRootIdentity(rootIdentity)"))
      .toBeGreaterThan(-1);
    expect(reuseImplementation.indexOf("return Object.freeze({ targetPath, reused: true })"))
      .toBeGreaterThan(reuseImplementation.indexOf(
        "await syncAndAssertRootIdentity(rootIdentity)",
      ));

    const syncStart = source.indexOf("const syncAndAssertRootIdentity = async");
    const syncEnd = source.indexOf("const reuseExactArtifact = async", syncStart);
    const syncImplementation = source.slice(syncStart, syncEnd);
    expect(syncImplementation).toMatch(
      /FS_CONSTANTS\.O_RDONLY\s*\|\s*FS_CONSTANTS\.O_NOFOLLOW\s*\|\s*FS_CONSTANTS\.O_NONBLOCK/s,
    );
    expect(syncImplementation.indexOf("await directoryHandle.stat()"))
      .toBeLessThan(syncImplementation.indexOf("await directoryHandle.sync()"));
    expect(syncImplementation.indexOf("await lstat(rootIdentity.path)"))
      .toBeGreaterThan(syncImplementation.indexOf("await directoryHandle.sync()"));

    const linkRaceStart = source.indexOf("if (error?.code !== 'EEXIST') throw error;");
    const linkRaceEnd = source.indexOf("return await reuseExactArtifact", linkRaceStart);
    const linkRaceCleanup = source.slice(linkRaceStart, linkRaceEnd);
    expect(linkRaceCleanup.indexOf("await unlink(temporaryPath)"))
      .toBeGreaterThan(-1);
    expect(linkRaceCleanup.indexOf("temporaryPath = null"))
      .toBeGreaterThan(linkRaceCleanup.indexOf("await unlink(temporaryPath)"));
    expect(linkRaceCleanup.indexOf("await waitForConcurrentWinnerSettle"))
      .toBeGreaterThan(linkRaceCleanup.indexOf("temporaryPath = null"));

    const settleStart = source.indexOf("const waitForConcurrentWinnerSettle = async");
    const settleEnd = source.indexOf("const reuseExactArtifact = async", settleStart);
    const settleImplementation = source.slice(settleStart, settleEnd);
    expect(settleImplementation).toContain("CONCURRENT_WINNER_SETTLE_ATTEMPTS");
    expect(settleImplementation).toContain("target.nlink === 1");
    expect(settleImplementation).toContain("entries.length === 1");
    expect(settleImplementation).toContain(
      "entries[0] === WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_FILE_NAME",
    );
  });
});

describe("IAB semantic follower source artifact v3", () => {
  test("publishes one owner-only v3 artifact and preserves original source expiry", async () => {
    const root = await makeV3Root();
    const issued = await completeSourceCapability();
    const result = await sourceArtifact
      .publishSyntheticWelcomeAudioIabSemanticFollowerSourceArtifactV3ForTest({
        artifact_root: root,
        private_complete_source_capability: issued.capability,
        now_ms: issued.nowMs,
      });

    expect(result.private_artifact).not.toBeNull();
    expect(result.private_source_artifact_capability).not.toBeNull();
    expect(result.redacted_receipt.decision).toBe(
      sourceArtifact.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_DECISION_V3.PUBLISHED,
    );
    expect(result.redacted_receipt.operation).toBe("materialize");
    expect(sourceArtifact.validateWelcomeAudioIabSemanticFollowerSourceArtifactV3(
      result.private_artifact,
      { now_ms: issued.nowMs },
    )).toEqual({ ok: true, reason: null });
    expect(sourceArtifact.validateWelcomeAudioIabSemanticFollowerSourceArtifactReceiptV3(
      result.redacted_receipt,
    )).toEqual({ ok: true, reason: null });
    expect(Date.parse(result.private_artifact!.source_expires_at)).toBe(
      Date.parse(result.private_artifact!.complete_source.source_observed_at) + 300_000,
    );
    expect(result.private_artifact!.source_expires_at).toBe(
      result.private_artifact!.complete_source.source_expires_at,
    );
    expect(result.private_artifact!.complete_source).toMatchObject({
      preopen_unread_inbound: "explicit_none",
      seen_transition: "absent",
      prior_welcome_audio: "explicit_none",
      prior_welcome_attempt: "explicit_none",
      dedupe_status: "clear",
      composer_status: "visible",
      attachment_control_status: "visible_and_usable",
      challenge_or_error_status: "absent",
      isolated_tab_finalized: "exactly_once",
    });
    const metadata = await lstat(result.artifact_path!);
    expect(metadata.isFile()).toBe(true);
    expect(metadata.nlink).toBe(1);
    expect(metadata.mode & 0o7777).toBe(0o600);
    expect(await readdir(root)).toEqual([
      sourceArtifact.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_FILE_NAME_V3,
    ]);
    expect(JSON.parse(await readFile(result.artifact_path!, "utf8")))
      .toEqual(result.private_artifact);
    expect(JSON.stringify(result.redacted_receipt)).not.toContain("private_candidate_a");
    expect(JSON.stringify(result.redacted_receipt)).not.toMatch(
      /private-thread|private-owner|2026-|[a-f0-9]{64}|\/Users\//,
    );
  });

  test("artifact capability is opaque, one-use, burn-first, and rejects replay or clones", async () => {
    const root = await makeV3Root();
    const issued = await completeSourceCapability();
    const result = await sourceArtifact
      .publishSyntheticWelcomeAudioIabSemanticFollowerSourceArtifactV3ForTest({
        artifact_root: root,
        private_complete_source_capability: issued.capability,
        now_ms: issued.nowMs,
    });
    const capability = result.private_source_artifact_capability!;
    expect(() => JSON.stringify(capability)).toThrow("not_serializable");
    expect(Object.keys(capability)).toEqual(["clone_guard"]);
    expect(() => structuredClone(capability)).toThrow();
    expect(sourceArtifact.consumeWelcomeAudioIabSemanticFollowerSourceArtifactCapabilityOnce({
      private_source_artifact_capability: { ...capability },
    })).toBeNull();
    expect(sourceArtifact.consumeWelcomeAudioIabSemanticFollowerSourceArtifactCapabilityOnce({
      private_source_artifact_capability: capability,
    })).toBeNull();
    expect(sourceArtifact
      .consumeWelcomeAudioIabSemanticFollowerSourceArtifactCapabilityOnceForTest({
        private_source_artifact_capability: capability,
      })).toBeNull();

    const validRoot = await makeV3Root();
    const validIssued = await completeSourceCapability();
    const valid = await sourceArtifact
      .publishSyntheticWelcomeAudioIabSemanticFollowerSourceArtifactV3ForTest({
        artifact_root: validRoot,
        private_complete_source_capability: validIssued.capability,
        now_ms: validIssued.nowMs,
      });
    const first = sourceArtifact
      .consumeWelcomeAudioIabSemanticFollowerSourceArtifactCapabilityOnceForTest({
        private_source_artifact_capability: valid.private_source_artifact_capability,
      });
    expect(first?.private_artifact).toEqual(valid.private_artifact);
    expect(sourceArtifact
      .consumeWelcomeAudioIabSemanticFollowerSourceArtifactCapabilityOnceForTest({
        private_source_artifact_capability: valid.private_source_artifact_capability,
      })).toBeNull();

    const replayRoot = await makeV3Root();
    const replay = await sourceArtifact
      .publishSyntheticWelcomeAudioIabSemanticFollowerSourceArtifactV3ForTest({
        artifact_root: replayRoot,
        private_complete_source_capability: issued.capability,
        now_ms: issued.nowMs,
      });
    expect(replay.private_artifact).toBeNull();
    expect(replay.redacted_receipt.blocker_codes).toEqual([
      sourceArtifact.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_BLOCKER_V3
        .COMPLETE_SOURCE_CAPABILITY_INVALID,
    ]);
  });

  test("opens the exact persisted artifact without renewing expiry and blocks stale open", async () => {
    const root = await makeV3Root();
    const issued = await completeSourceCapability();
    const published = await sourceArtifact
      .publishSyntheticWelcomeAudioIabSemanticFollowerSourceArtifactV3ForTest({
        artifact_root: root,
        private_complete_source_capability: issued.capability,
        now_ms: issued.nowMs,
      });
    const opened = await sourceArtifact
      .openSyntheticWelcomeAudioIabSemanticFollowerSourceArtifactV3ForTest({
        artifact_root: root,
        now_ms: issued.nowMs + 1,
      });
    expect(opened.private_artifact?.source_expires_at).toBe(
      published.private_artifact?.source_expires_at,
    );
    expect(opened.redacted_receipt.decision).toBe(
      sourceArtifact.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_DECISION_V3.OPENED,
    );
    expect(opened.redacted_receipt.operation).toBe("open");
    expect(sourceArtifact.validateWelcomeAudioIabSemanticFollowerSourceArtifactReceiptV3(
      opened.redacted_receipt,
    )).toEqual({ ok: true, reason: null });

    const stale = await sourceArtifact
      .openSyntheticWelcomeAudioIabSemanticFollowerSourceArtifactV3ForTest({
        artifact_root: root,
        now_ms: Date.parse(published.private_artifact!.source_expires_at),
      });
    expect(stale.private_artifact).toBeNull();
    expect(stale.private_source_artifact_capability).toBeNull();
    expect(stale.redacted_receipt).toMatchObject({
      operation: "open",
      complete_source_capability_consumed: false,
      complete_source_validated: false,
      source_expiry_inherited: false,
      owner_only_root_verified: true,
      artifact_stability_verified: true,
    });
    expect(sourceArtifact.validateWelcomeAudioIabSemanticFollowerSourceArtifactReceiptV3(
      stale.redacted_receipt,
    )).toEqual({ ok: true, reason: null });
  });

  test("artifact capability expires at the original instant and stale consumption burns replay", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-19T18:00:00.000Z"));
    const root = await makeV3Root();
    const issued = await completeSourceCapability();
    const published = await sourceArtifact
      .publishSyntheticWelcomeAudioIabSemanticFollowerSourceArtifactV3ForTest({
        artifact_root: root,
        private_complete_source_capability: issued.capability,
        now_ms: issued.nowMs,
      });
    vi.setSystemTime(Date.parse(published.private_artifact!.source_expires_at));
    expect(sourceArtifact
      .consumeWelcomeAudioIabSemanticFollowerSourceArtifactCapabilityOnceForTest({
        private_source_artifact_capability: published.private_source_artifact_capability,
      })).toBeNull();
    vi.setSystemTime(issued.nowMs);
    expect(sourceArtifact
      .consumeWelcomeAudioIabSemanticFollowerSourceArtifactCapabilityOnceForTest({
        private_source_artifact_capability: published.private_source_artifact_capability,
      })).toBeNull();
  });

  test("v3 publication rejects caller facts, unsafe roots, and foreign capabilities", async () => {
    const root = await makeV3Root();
    const foreign = await sourceArtifact
      .publishSyntheticWelcomeAudioIabSemanticFollowerSourceArtifactV3ForTest({
        artifact_root: root,
        private_complete_source_capability: Object.freeze({}),
        now_ms: Date.now(),
      });
    expect(foreign.redacted_receipt.blocker_codes).toEqual([
      sourceArtifact.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_BLOCKER_V3
        .COMPLETE_SOURCE_CAPABILITY_INVALID,
    ]);

    const issued = await completeSourceCapability();
    const withCallerFact = await sourceArtifact
      .publishSyntheticWelcomeAudioIabSemanticFollowerSourceArtifactV3ForTest({
        artifact_root: root,
        private_complete_source_capability: issued.capability,
        now_ms: issued.nowMs,
        exact_target_utf8: "caller_fabricated",
      } as never);
    expect(withCallerFact.redacted_receipt.blocker_codes).toEqual([
      sourceArtifact.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_BLOCKER_V3.INPUT_INVALID,
    ]);

    const wrongModeRoot = await makeV3Root();
    await chmod(wrongModeRoot, 0o755);
    const issuedForRoot = await completeSourceCapability();
    const wrongMode = await sourceArtifact
      .publishSyntheticWelcomeAudioIabSemanticFollowerSourceArtifactV3ForTest({
        artifact_root: wrongModeRoot,
        private_complete_source_capability: issuedForRoot.capability,
        now_ms: issuedForRoot.nowMs,
      });
    expect(wrongMode.redacted_receipt.blocker_codes).toEqual([
      sourceArtifact.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_BLOCKER_V3.ROOT_INVALID,
    ]);
  });

  test("revalidates persisted handle, 3-to-7-day bucket, and four globally distinct references", async () => {
    const root = await makeV3Root();
    const issued = await completeSourceCapability();
    const published = await sourceArtifact
      .publishSyntheticWelcomeAudioIabSemanticFollowerSourceArtifactV3ForTest({
        artifact_root: root,
        private_complete_source_capability: issued.capability,
        now_ms: issued.nowMs,
      });
    expect(published.private_artifact).not.toBeNull();

    const invalidTarget: any = structuredClone(published.private_artifact);
    invalidTarget.complete_source.exact_target_utf8 = "invalid-handle!";
    expect(sourceArtifact.validateWelcomeAudioIabSemanticFollowerSourceArtifactV3(
      realignV3DerivedEvidence(invalidTarget, issued.nowMs),
      { now_ms: issued.nowMs },
    ).ok).toBe(false);

    const invalidBucket: any = structuredClone(published.private_artifact);
    invalidBucket.complete_source.visible_time_bucket_utf8 = "recent";
    expect(sourceArtifact.validateWelcomeAudioIabSemanticFollowerSourceArtifactV3(
      realignV3DerivedEvidence(invalidBucket, issued.nowMs),
      { now_ms: issued.nowMs },
    ).ok).toBe(false);

    const referenceFields = [
      "exact_notification_reference",
      "exact_profile_reference",
      "exact_thread_reference",
      "exact_owner_account_reference",
    ];
    for (let left = 0; left < referenceFields.length; left += 1) {
      for (let right = left + 1; right < referenceFields.length; right += 1) {
        const collision: any = structuredClone(published.private_artifact);
        collision.complete_source[referenceFields[right]] =
          collision.complete_source[referenceFields[left]];
        const aligned = realignV3DerivedEvidence(collision, issued.nowMs);
        expect(sourceArtifact.validateWelcomeAudioIabSemanticFollowerSourceArtifactV3(
          aligned,
          { now_ms: issued.nowMs },
        ).ok).toBe(false);
      }
    }
  });

  test("requires receipt operation and exact operation-specific blocker progress", async () => {
    const root = await makeV3Root();
    const issued = await completeSourceCapability();
    const published = await sourceArtifact
      .publishSyntheticWelcomeAudioIabSemanticFollowerSourceArtifactV3ForTest({
        artifact_root: root,
        private_complete_source_capability: issued.capability,
        now_ms: issued.nowMs,
      });
    const base: any = published.redacted_receipt;
    const progressFields = [
      "complete_source_capability_consumed",
      "complete_source_validated",
      "source_expiry_inherited",
      "owner_only_root_verified",
      "artifact_stability_verified",
    ];
    const blockedReceipt = (operation: "materialize" | "open", blocker: string, signature: string) => {
      const receipt: any = structuredClone(base);
      receipt.decision = sourceArtifact
        .WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_DECISION_V3.BLOCKED;
      receipt.operation = operation;
      progressFields.forEach((field, index) => {
        receipt[field] = signature[index] === "1";
      });
      receipt.artifact_published = false;
      receipt.existing_artifact_reused = false;
      receipt.artifact_opened = false;
      receipt.private_artifact_capability_issued = false;
      receipt.artifact_count = 0;
      receipt.blocker_codes = [blocker];
      return receipt;
    };
    const B = sourceArtifact.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_BLOCKER_V3;
    const validCases: Array<["materialize" | "open", string, string]> = [
      ["materialize", B.INPUT_INVALID, "00000"],
      ["materialize", B.COMPLETE_SOURCE_CAPABILITY_INVALID, "00000"],
      ["materialize", B.COMPLETE_SOURCE_INVALID, "10000"],
      ["materialize", B.ROOT_INVALID, "11100"],
      ["materialize", B.ROOT_INVALID, "11110"],
      ["materialize", B.ARTIFACT_INVALID, "11110"],
      ["materialize", B.TARGET_CONFLICT, "11110"],
      ["materialize", B.PUBLICATION_FAILED, "11110"],
      ["materialize", B.ARTIFACT_CAPABILITY_INVALID, "11111"],
      ["open", B.INPUT_INVALID, "00000"],
      ["open", B.ROOT_INVALID, "00000"],
      ["open", B.ROOT_INVALID, "00010"],
      ["open", B.ARTIFACT_INVALID, "00010"],
      ["open", B.ARTIFACT_INVALID, "00011"],
      ["open", B.ARTIFACT_CAPABILITY_INVALID, "01111"],
    ];
    for (const [operation, blocker, signature] of validCases) {
      expect(sourceArtifact.validateWelcomeAudioIabSemanticFollowerSourceArtifactReceiptV3(
        blockedReceipt(operation, blocker, signature),
      )).toEqual({ ok: true, reason: null });
    }

    const invalidCases = [
      blockedReceipt("materialize", B.COMPLETE_SOURCE_INVALID, "00000"),
      blockedReceipt("materialize", B.ARTIFACT_INVALID, "00011"),
      blockedReceipt("open", B.COMPLETE_SOURCE_INVALID, "10000"),
      blockedReceipt("open", B.ARTIFACT_CAPABILITY_INVALID, "11111"),
    ];
    const missingOperation: any = structuredClone(base);
    delete missingOperation.operation;
    invalidCases.push(missingOperation);
    const wrongSuccessOperation: any = structuredClone(base);
    wrongSuccessOperation.operation = "open";
    invalidCases.push(wrongSuccessOperation);
    for (const receipt of invalidCases) {
      expect(sourceArtifact.validateWelcomeAudioIabSemanticFollowerSourceArtifactReceiptV3(
        receipt,
      ).ok).toBe(false);
    }
  });

  test("binds every v3 receipt decision to its exact flag and operation truth table", async () => {
    const root = await makeV3Root();
    const issued = await completeSourceCapability();
    const published = await sourceArtifact
      .publishSyntheticWelcomeAudioIabSemanticFollowerSourceArtifactV3ForTest({
        artifact_root: root,
        private_complete_source_capability: issued.capability,
        now_ms: issued.nowMs,
      });
    const base: any = published.redacted_receipt;
    const flags = [
      "artifact_published",
      "existing_artifact_reused",
      "artifact_opened",
    ] as const;
    const operations = ["materialize", "open"] as const;
    const decisions = [
      {
        decision: sourceArtifact
          .WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_DECISION_V3.PUBLISHED,
        flagMask: 0b001,
        operation: "materialize",
      },
      {
        decision: sourceArtifact
          .WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_DECISION_V3.REUSED,
        flagMask: 0b010,
        operation: "materialize",
      },
      {
        decision: sourceArtifact
          .WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_DECISION_V3.OPENED,
        flagMask: 0b100,
        operation: "open",
      },
    ] as const;
    const readyReceipt = (
      decision: string,
      flagMask: number,
      operation: typeof operations[number],
    ) => {
      const receipt: any = structuredClone(base);
      receipt.decision = decision;
      receipt.operation = operation;
      flags.forEach((flag, index) => {
        receipt[flag] = (flagMask & (1 << index)) !== 0;
      });
      receipt.complete_source_capability_consumed = operation === "materialize";
      receipt.complete_source_validated = true;
      receipt.source_expiry_inherited = true;
      receipt.owner_only_root_verified = true;
      receipt.artifact_stability_verified = true;
      return receipt;
    };

    for (const expected of decisions) {
      for (let flagMask = 0; flagMask < 8; flagMask += 1) {
        for (const operation of operations) {
          const validation = sourceArtifact
            .validateWelcomeAudioIabSemanticFollowerSourceArtifactReceiptV3(
              readyReceipt(expected.decision, flagMask, operation),
            );
          expect(validation.ok).toBe(
            flagMask === expected.flagMask && operation === expected.operation,
          );
        }
      }

      const valid = readyReceipt(
        expected.decision,
        expected.flagMask,
        expected.operation,
      );
      expect(sourceArtifact.validateWelcomeAudioIabSemanticFollowerSourceArtifactReceiptV3(
        valid,
      )).toEqual({ ok: true, reason: null });
      for (const flag of flags) {
        const oneFlagMutation: any = structuredClone(valid);
        oneFlagMutation[flag] = !oneFlagMutation[flag];
        expect(sourceArtifact
          .validateWelcomeAudioIabSemanticFollowerSourceArtifactReceiptV3(
            oneFlagMutation,
          ).ok).toBe(false);
      }
    }

    const coordinatedInvalidMutations = [
      readyReceipt(
        sourceArtifact.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_DECISION_V3.PUBLISHED,
        0b010,
        "materialize",
      ),
      readyReceipt(
        sourceArtifact.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_DECISION_V3.OPENED,
        0b001,
        "materialize",
      ),
      readyReceipt(
        sourceArtifact.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_DECISION_V3.REUSED,
        0b100,
        "open",
      ),
    ];
    for (const receipt of coordinatedInvalidMutations) {
      expect(sourceArtifact.validateWelcomeAudioIabSemanticFollowerSourceArtifactReceiptV3(
        receipt,
      ).ok).toBe(false);
    }

    for (const operation of operations) {
      for (let flagMask = 0; flagMask < 8; flagMask += 1) {
        const blocked: any = structuredClone(base);
        blocked.decision = sourceArtifact
          .WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_DECISION_V3.BLOCKED;
        blocked.operation = operation;
        flags.forEach((flag, index) => {
          blocked[flag] = (flagMask & (1 << index)) !== 0;
        });
        blocked.complete_source_capability_consumed = false;
        blocked.complete_source_validated = false;
        blocked.source_expiry_inherited = false;
        blocked.owner_only_root_verified = false;
        blocked.artifact_stability_verified = false;
        blocked.private_artifact_capability_issued = false;
        blocked.artifact_count = 0;
        blocked.blocker_codes = [
          sourceArtifact.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_BLOCKER_V3.INPUT_INVALID,
        ];
        expect(sourceArtifact
          .validateWelcomeAudioIabSemanticFollowerSourceArtifactReceiptV3(blocked).ok)
          .toBe(flagMask === 0);
      }
    }
  });

  test("open preserves root and stable-read progress when persisted bytes are invalid", async () => {
    const B = sourceArtifact.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_BLOCKER_V3;
    const root = await makeV3Root();
    const issued = await completeSourceCapability();
    const published = await sourceArtifact
      .publishSyntheticWelcomeAudioIabSemanticFollowerSourceArtifactV3ForTest({
        artifact_root: root,
        private_complete_source_capability: issued.capability,
        now_ms: issued.nowMs,
      });
    await writeFile(published.artifact_path!, "{}");

    const opened = await sourceArtifact
      .openSyntheticWelcomeAudioIabSemanticFollowerSourceArtifactV3ForTest({
        artifact_root: root,
        now_ms: issued.nowMs + 1,
      });
    expect(opened.private_artifact).toBeNull();
    expect(opened.private_source_artifact_capability).toBeNull();
    expect(opened.redacted_receipt).toMatchObject({
      operation: "open",
      complete_source_capability_consumed: false,
      complete_source_validated: false,
      source_expiry_inherited: false,
      owner_only_root_verified: true,
      artifact_stability_verified: true,
      blocker_codes: [B.ARTIFACT_INVALID],
    });
    expect(sourceArtifact.validateWelcomeAudioIabSemanticFollowerSourceArtifactReceiptV3(
      opened.redacted_receipt,
    )).toEqual({ ok: true, reason: null });
  });
});
