import { createHash } from "node:crypto";
import {
  chmod,
  link,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { afterEach, describe, expect, test } from "vitest";

import {
  BOOTSTRAP_INPUT_FILE_NAMES,
  BOOTSTRAP_STAGING_FILE_NAMES,
  FORBIDDEN_LIVE_FILE_NAME,
  SYNTHETIC_TEST_ROOT_PREFIX,
  WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_ASSET_SELECTION_SCHEMA_VERSION,
  WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_AUTHORIZATION_SCHEMA_VERSION,
  WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER,
  WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_DECISION,
  WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_MAX_RECORDS,
  WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_MISSION_ID,
  WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_OPERATION_BINDINGS_SCHEMA_VERSION,
  WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_RECEIPT_FIELDS,
  WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_SOURCE_FRESHNESS_MS,
  WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_SOURCE_CAPTURE_SCHEMA_VERSION,
  prepareSyntheticWelcomeAudioAuthorityBootstrapStaging,
  validateWelcomeAudioAuthorityBootstrapReceipt,
} from "../scripts/crm-vnext-instagram-welcome-audio-authority-bundle-builder.mjs";
import {
  WELCOME_AUDIO_CAMPAIGN_INTERVAL_SCHEMA_VERSION,
  WELCOME_AUDIO_EXACT_IDENTITY_ANCHOR_SCHEMA_VERSION,
  WELCOME_AUDIO_SEALED_MANIFEST_SCHEMA_VERSION,
  computeWelcomeAudioExactIdentityAnchorSha256,
} from "../scripts/crm-vnext-instagram-welcome-audio-live-preflight.mjs";

const cleanupPaths: string[] = [];
const NOW_MS = Date.parse("2026-07-16T12:00:00.000Z");
const TARGET_MISSION_ID =
  "crm_core_real_new_follower_welcome_e2e_canary_approval_c2fb4dc_20260715";
const TARGET_CONTRACT_VERSION = "crm_core_real_new_follower_welcome_e2e_proof_mission_v0";

afterEach(async () => {
  await Promise.all(cleanupPaths.splice(0).map((path) => rm(path, {
    recursive: true,
    force: true,
  })));
});

const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [
        key,
        canonicalize((value as Record<string, unknown>)[key]),
      ]),
    );
  }
  return value;
};
const canonicalBytes = (value: unknown) => Buffer.from(
  `${JSON.stringify(canonicalize(value))}\n`,
  "utf8",
);
const referenceAnchor = (domain: string, exactUtf8: string) => {
  const bytes = Buffer.from(exactUtf8, "utf8");
  const size = Buffer.allocUnsafe(4);
  size.writeUInt32BE(bytes.length, 0);
  return sha256(Buffer.concat([Buffer.from(domain, "utf8"), size, bytes]));
};
const deriveThreadAnchorSha256 = (value: string) => referenceAnchor(
  "crm-core:instagram:bound-thread-reference-utf8:v1\0",
  value,
);
const deriveOwnerAnchorSha256 = (value: string) => referenceAnchor(
  "crm-core:instagram:owner-account-reference-utf8:v1\0",
  value,
);
const deriveSourceEventAnchorSha256 = (value: string) => referenceAnchor(
  "crm-core:instagram:source-event-reference-utf8:v1\0",
  value,
);
const json = async (path: string) => JSON.parse(await readFile(path, "utf8"));

type Fixture = Awaited<ReturnType<typeof createFixture>>;

const sourceRecord = (ordinal: number, owner = "synthetic-owner-account") => ({
  ordinal,
  exact_target_utf8: `Synthetic.Private.Target.${ordinal}`,
  identity_binding_evidence: "exact_profile_identity_and_follow_signal_observed",
  followed_at: `2026-07-13T${String(12 + ordinal).padStart(2, "0")}:00:00.000Z`,
  source_observed_at: "2026-07-16T11:59:00.000Z",
  follow_time_evidence: "exact_absolute_source_timestamp",
  campaign_membership_evidence: "exact_follow_timestamp_within_approved_campaign_interval",
  bound_thread_reference_utf8: `synthetic-private-thread-${ordinal}`,
  thread_binding_evidence: "exact_bound_thread_observed",
  owner_account_reference_utf8: owner,
  owner_binding_evidence: "exact_owner_account_observed",
  source_event_reference_utf8: `synthetic-private-source-event-${ordinal}`,
  source_event_binding_evidence: "exact_source_event_observed",
});

const createFixture = async (count = 2) => {
  const root = await realpath(await mkdtemp(join(tmpdir(), SYNTHETIC_TEST_ROOT_PREFIX)));
  cleanupPaths.push(root);
  await chmod(root, 0o700);
  const inputRoot = join(root, "input");
  await mkdir(inputRoot, { mode: 0o700 });
  const audioPath = join(root, "synthetic-approved-audio.m4a");
  const audioBytes = Buffer.from("synthetic approved welcome audio bytes only", "utf8");
  await writeFile(audioPath, audioBytes, { mode: 0o600 });
  const sourceCapture = {
    schema_version: WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_SOURCE_CAPTURE_SCHEMA_VERSION,
    capture_status: "exact_private_source_capture_complete",
    capture_method: "safari_native_instagram_read_only",
    captured_at: "2026-07-16T11:59:30.000Z",
    timestamp_evidence: "absolute_timestamps_only_not_relative",
    campaign_evidence: {
      start_at: "2026-07-13T12:00:00.000Z",
      end_at: "2026-07-14T12:00:00.000Z",
      interval_evidence: "exact_approved_campaign_interval",
      campaign_membership_evidence: "explicit_source_event_membership",
      inference_status: "explicit_not_inferred",
    },
    owner_account_reference_utf8: "synthetic-owner-account",
    owner_binding_evidence: "exact_owner_account_observed",
    ordered_records: Array.from({ length: count }, (_, index) => sourceRecord(index + 1)),
  };
  const assetSelection = {
    schema_version: WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_ASSET_SELECTION_SCHEMA_VERSION,
    selection_status: "exact_audio_asset_explicitly_approved",
    asset_id: "synthetic_approved_asset_001",
    source_path: audioPath,
    expected_sha256: sha256(audioBytes),
    asset_approval_evidence: "exact_asset_bytes_explicitly_approved",
    inference_status: "explicit_not_inferred",
  };
  const authorization = {
    schema_version: WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_AUTHORIZATION_SCHEMA_VERSION,
    status: "approved_for_no_live_bootstrap_only",
    bootstrap_mission_id: WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_MISSION_ID,
    target_mission_id: TARGET_MISSION_ID,
    target_contract_version: TARGET_CONTRACT_VERSION,
    central_repo_head: "c2fb4dc32de26be8f7f8cb2f4e1a39c19deb8c75",
    authorization_id: "synthetic_no_live_bootstrap_authorization_001",
    record_cap: WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_MAX_RECORDS,
    source_capture_sha256: "0".repeat(64),
    asset_selection_sha256: "0".repeat(64),
    approved_at: "2026-07-16T11:30:00.000Z",
    authority_scope: "owner_only_staging_without_live_execution_authority",
    execution_approval_authorized: false,
    external_effect_authorized: false,
  };

  const writeInputs = async () => {
    const sourceBytes = canonicalBytes(sourceCapture);
    const assetBytes = canonicalBytes(assetSelection);
    authorization.source_capture_sha256 = sha256(sourceBytes);
    authorization.asset_selection_sha256 = sha256(assetBytes);
    await Promise.all([
      writeFile(
        join(inputRoot, BOOTSTRAP_INPUT_FILE_NAMES.sourceCapture),
        sourceBytes,
        { mode: 0o600 },
      ),
      writeFile(
        join(inputRoot, BOOTSTRAP_INPUT_FILE_NAMES.assetSelection),
        assetBytes,
        { mode: 0o600 },
      ),
      writeFile(
        join(inputRoot, BOOTSTRAP_INPUT_FILE_NAMES.authorization),
        canonicalBytes(authorization),
        { mode: 0o600 },
      ),
    ]);
  };
  await writeInputs();
  return {
    root,
    inputRoot,
    audioPath,
    audioBytes,
    sourceCapture,
    assetSelection,
    authorization,
    writeInputs,
  };
};

const expectBlocked = async (
  promise: Promise<unknown>,
  code: string,
) => {
  try {
    await promise;
    throw new Error("expected bootstrap to be blocked");
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
    const blocked = error as Error & {
      code: string;
      redacted_receipt: Record<string, unknown>;
    };
    expect(blocked.name).toBe("WelcomeAudioAuthorityBootstrapBlocked");
    expect(blocked.code).toBe(code);
    expect(blocked.message).toBe(code);
    expect("cause" in blocked).toBe(false);
    expect(blocked.redacted_receipt).toMatchObject({
      decision: WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_DECISION.BLOCKED,
      execution_approval_published: false,
      live_authority_root_touched: false,
      external_effect_invoked: false,
      blocker_codes: [code],
    });
  }
};

const run = (
  fixture: Fixture,
  beforePublish?: ({ temporaryRoot }: { temporaryRoot: string }) => Promise<void>,
  nowMs: () => number = () => NOW_MS,
) =>
  prepareSyntheticWelcomeAudioAuthorityBootstrapStaging({
    test_root: fixture.root,
    now_ms: nowMs,
    test_only_before_publish: beforePublish ?? null,
  });

describe("welcome-audio no-live authority bootstrap builder", () => {
  test("atomically publishes the exact owner-only no-live bundle and aggregate receipt", async () => {
    const fixture = await createFixture(2);
    const liveRoot = join(fixture.root, "live-authority");
    await mkdir(liveRoot, { mode: 0o700 });
    const liveSentinel = join(liveRoot, "sentinel.json");
    await writeFile(liveSentinel, Buffer.from("{}\n"), { mode: 0o600 });
    const beforeLive = await readFile(liveSentinel);

    const result = await run(fixture);
    const stagingRoot = join(fixture.root, "staging");
    expect(result.staging_root).toBe(stagingRoot);
    expect(result.redacted_receipt).toEqual(expect.objectContaining({
      decision: WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_DECISION.STAGED,
      records_seen_count: 2,
      records_staged_count: 2,
      record_cap: WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_MAX_RECORDS,
      execution_approval_published: false,
      live_authority_root_touched: false,
      external_effect_invoked: false,
      blocker_codes: [],
    }));
    expect(validateWelcomeAudioAuthorityBootstrapReceipt(result.redacted_receipt))
      .toEqual({ ok: true, reason: null });
    expect(Object.keys(result.redacted_receipt).sort())
      .toEqual([...WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_RECEIPT_FIELDS].sort());
    const serializedReceipt = JSON.stringify(result.redacted_receipt);
    for (const privateValue of [
      fixture.sourceCapture.owner_account_reference_utf8,
      fixture.sourceCapture.ordered_records[0].exact_target_utf8,
      fixture.audioPath,
      fixture.assetSelection.expected_sha256,
      fixture.authorization.authorization_id,
    ]) expect(serializedReceipt).not.toContain(privateValue);

    const entries = (await readdir(stagingRoot)).sort();
    expect(entries).toEqual([
      "approved-welcome-audio.m4a",
      BOOTSTRAP_STAGING_FILE_NAMES.receipt,
      BOOTSTRAP_STAGING_FILE_NAMES.interval,
      BOOTSTRAP_STAGING_FILE_NAMES.operationBindings,
      BOOTSTRAP_STAGING_FILE_NAMES.manifest,
    ].sort());
    expect(entries).not.toContain(FORBIDDEN_LIVE_FILE_NAME);
    const stagingMetadata = await lstat(stagingRoot);
    expect(stagingMetadata.mode & 0o777).toBe(0o700);
    for (const fileName of entries) {
      const metadata = await lstat(join(stagingRoot, fileName));
      expect(metadata.isFile()).toBe(true);
      expect(metadata.isSymbolicLink()).toBe(false);
      expect(metadata.mode & 0o777).toBe(0o600);
      expect(metadata.nlink).toBe(1);
    }
    expect(await readFile(join(stagingRoot, "approved-welcome-audio.m4a")))
      .toEqual(fixture.audioBytes);
    expect(await readFile(liveSentinel)).toEqual(beforeLive);
    expect(await readdir(liveRoot)).toEqual(["sentinel.json"]);

    const interval = await json(join(stagingRoot, BOOTSTRAP_STAGING_FILE_NAMES.interval));
    const manifest = await json(join(stagingRoot, BOOTSTRAP_STAGING_FILE_NAMES.manifest));
    const bindings = await json(join(
      stagingRoot,
      BOOTSTRAP_STAGING_FILE_NAMES.operationBindings,
    ));
    const receipt = await json(join(stagingRoot, BOOTSTRAP_STAGING_FILE_NAMES.receipt));
    expect(interval).toEqual({
      schema_version: WELCOME_AUDIO_CAMPAIGN_INTERVAL_SCHEMA_VERSION,
      start_at: fixture.sourceCapture.campaign_evidence.start_at,
      end_at: fixture.sourceCapture.campaign_evidence.end_at,
    });
    expect(manifest).toMatchObject({
      schema_version: WELCOME_AUDIO_SEALED_MANIFEST_SCHEMA_VERSION,
      identity_anchor_schema_version: WELCOME_AUDIO_EXACT_IDENTITY_ANCHOR_SCHEMA_VERSION,
      mission_id: TARGET_MISSION_ID,
      contract_version: TARGET_CONTRACT_VERSION,
    });
    expect(manifest.ordered_records).toHaveLength(2);
    expect(manifest.ordered_records[0].identity_anchor_sha256).toBe(
      computeWelcomeAudioExactIdentityAnchorSha256(
        fixture.sourceCapture.ordered_records[0].exact_target_utf8,
      ),
    );
    expect(bindings).toMatchObject({
      schema_version: WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_OPERATION_BINDINGS_SCHEMA_VERSION,
      status: "prepared_no_live_staging_only",
      approved_audio_asset_path: join(stagingRoot, "approved-welcome-audio.m4a"),
      approved_audio_asset_sha256: fixture.assetSelection.expected_sha256,
    });
    expect(bindings.operation_bindings).toHaveLength(2);
    expect(bindings.operation_bindings[0]).toMatchObject({
      manifest_ordinal: 1,
      exact_target_utf8: fixture.sourceCapture.ordered_records[0].exact_target_utf8,
      thread_anchor_sha256: deriveThreadAnchorSha256(
        fixture.sourceCapture.ordered_records[0].bound_thread_reference_utf8,
      ),
      owner_anchor_sha256: deriveOwnerAnchorSha256(
        fixture.sourceCapture.owner_account_reference_utf8,
      ),
      source_event_anchor_sha256: deriveSourceEventAnchorSha256(
        fixture.sourceCapture.ordered_records[0].source_event_reference_utf8,
      ),
      source_observed_at: fixture.sourceCapture.ordered_records[0].source_observed_at,
    });
    expect(Object.keys(bindings.operation_bindings[0]).sort()).toEqual([
      "manifest_ordinal",
      "operation_id",
      "exact_target_utf8",
      "identity_anchor_sha256",
      "thread_anchor_sha256",
      "owner_anchor_sha256",
      "source_event_anchor_sha256",
      "source_observed_at",
    ].sort());
    expect(receipt).toEqual(result.redacted_receipt);
  });

  test("derives deterministic domain-separated identity, thread, owner, and source-event anchors", async () => {
    const fixture = await createFixture(1);
    const record = fixture.sourceCapture.ordered_records[0];
    const identity = computeWelcomeAudioExactIdentityAnchorSha256(record.exact_target_utf8);
    const thread = deriveThreadAnchorSha256(record.exact_target_utf8);
    const owner = deriveOwnerAnchorSha256(record.exact_target_utf8);
    const sourceEvent = deriveSourceEventAnchorSha256(record.exact_target_utf8);
    expect(new Set([identity, thread, owner, sourceEvent]).size).toBe(4);
    expect(deriveThreadAnchorSha256(record.exact_target_utf8)).toBe(thread);
    expect([thread, owner, sourceEvent].every((value) => /^[a-f0-9]{64}$/.test(value)))
      .toBe(true);
  });

  test.each([
    ["relative follow time", (fixture: Fixture) => {
      fixture.sourceCapture.ordered_records[0].followed_at = "2 days ago";
    }, WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.TIME_EVIDENCE_AMBIGUOUS],
    ["offset rather than canonical Z time", (fixture: Fixture) => {
      fixture.sourceCapture.ordered_records[0].followed_at = "2026-07-13T08:00:00.000-05:00";
    }, WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.TIME_EVIDENCE_AMBIGUOUS],
    ["relative source observation time", (fixture: Fixture) => {
      fixture.sourceCapture.ordered_records[0].source_observed_at = "one minute ago";
    }, WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.TIME_EVIDENCE_AMBIGUOUS],
    ["inferred campaign interval", (fixture: Fixture) => {
      fixture.sourceCapture.campaign_evidence.inference_status = "inferred";
    }, WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.CAMPAIGN_EVIDENCE_AMBIGUOUS],
    ["approximate campaign membership", (fixture: Fixture) => {
      fixture.sourceCapture.ordered_records[0].campaign_membership_evidence = "probable";
    }, WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.CAMPAIGN_EVIDENCE_AMBIGUOUS],
    ["ambiguous identity evidence", (fixture: Fixture) => {
      fixture.sourceCapture.ordered_records[0].identity_binding_evidence = "ocr_guess";
    }, WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.IDENTITY_EVIDENCE_AMBIGUOUS],
    ["ambiguous thread evidence", (fixture: Fixture) => {
      fixture.sourceCapture.ordered_records[0].thread_binding_evidence = "probable_thread";
    }, WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.THREAD_EVIDENCE_AMBIGUOUS],
    ["mismatched owner evidence", (fixture: Fixture) => {
      fixture.sourceCapture.ordered_records[0].owner_account_reference_utf8 = "other-owner";
    }, WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.OWNER_EVIDENCE_AMBIGUOUS],
  ])("rejects %s without a staged bundle", async (_label, mutate, code) => {
    const fixture = await createFixture(1);
    mutate(fixture);
    await fixture.writeInputs();
    await expectBlocked(run(fixture), code);
    await expect(lstat(join(fixture.root, "staging"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  test("rejects records outside the exact campaign interval", async () => {
    const fixture = await createFixture(1);
    fixture.sourceCapture.ordered_records[0].followed_at = "2026-07-15T13:00:00.000Z";
    await fixture.writeInputs();
    await expectBlocked(
      run(fixture),
      WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.CAMPAIGN_EVIDENCE_AMBIGUOUS,
    );
  });

  test("accepts the exact five-minute observation boundary and rejects stale or future observations", async () => {
    const exactBoundary = await createFixture(1);
    exactBoundary.sourceCapture.ordered_records[0].source_observed_at = new Date(
      NOW_MS - WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_SOURCE_FRESHNESS_MS,
    ).toISOString();
    await exactBoundary.writeInputs();
    await expect(run(exactBoundary)).resolves.toMatchObject({
      redacted_receipt: {
        decision: WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_DECISION.STAGED,
      },
    });

    const stale = await createFixture(1);
    stale.sourceCapture.ordered_records[0].source_observed_at = new Date(
      NOW_MS - WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_SOURCE_FRESHNESS_MS - 1,
    ).toISOString();
    await stale.writeInputs();
    await expectBlocked(
      run(stale),
      WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.TIME_EVIDENCE_AMBIGUOUS,
    );

    const future = await createFixture(1);
    future.sourceCapture.ordered_records[0].source_observed_at = new Date(NOW_MS + 1).toISOString();
    await future.writeInputs();
    await expectBlocked(
      run(future),
      WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.TIME_EVIDENCE_AMBIGUOUS,
    );
  });

  test("rechecks source freshness on a fresh clock immediately before atomic rename", async () => {
    const fixture = await createFixture(1);
    let clockReads = 0;
    const clock = () => {
      clockReads += 1;
      return clockReads === 1
        ? NOW_MS
        : NOW_MS + WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_SOURCE_FRESHNESS_MS + 1;
    };
    await expectBlocked(
      run(fixture, undefined, clock),
      WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.TIME_EVIDENCE_AMBIGUOUS,
    );
    expect(clockReads).toBe(2);
    await expect(lstat(join(fixture.root, "staging"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  test("rejects duplicate exact identities, threads, and source events", async () => {
    const duplicateIdentity = await createFixture(2);
    duplicateIdentity.sourceCapture.ordered_records[1].exact_target_utf8 =
      duplicateIdentity.sourceCapture.ordered_records[0].exact_target_utf8;
    await duplicateIdentity.writeInputs();
    await expectBlocked(
      run(duplicateIdentity),
      WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.DUPLICATE_BINDING,
    );

    const duplicateThread = await createFixture(2);
    duplicateThread.sourceCapture.ordered_records[1].bound_thread_reference_utf8 =
      duplicateThread.sourceCapture.ordered_records[0].bound_thread_reference_utf8;
    await duplicateThread.writeInputs();
    await expectBlocked(
      run(duplicateThread),
      WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.DUPLICATE_BINDING,
    );

    const duplicateSourceEvent = await createFixture(2);
    duplicateSourceEvent.sourceCapture.ordered_records[1].source_event_reference_utf8 =
      duplicateSourceEvent.sourceCapture.ordered_records[0].source_event_reference_utf8;
    await duplicateSourceEvent.writeInputs();
    await expectBlocked(
      run(duplicateSourceEvent),
      WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.DUPLICATE_BINDING,
    );
  });

  test("rejects over-cap, unordered, and extra-key source captures", async () => {
    const overCap = await createFixture(9);
    await expectBlocked(
      run(overCap),
      WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.RECORD_CAP_INVALID,
    );

    const unordered = await createFixture(2);
    unordered.sourceCapture.ordered_records[1].ordinal = 3;
    await unordered.writeInputs();
    await expectBlocked(
      run(unordered),
      WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.RECORD_ORDER_INVALID,
    );

    const extra = await createFixture(1);
    (extra.sourceCapture as Record<string, unknown>).unexpected_private_field = "value";
    await extra.writeInputs();
    await expectBlocked(
      run(extra),
      WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.INPUT_SCHEMA_INVALID,
    );
  });

  test("requires exact authorization digests, schema, no-live scope, and no external authority", async () => {
    const digestMismatch = await createFixture(1);
    digestMismatch.authorization.source_capture_sha256 = "f".repeat(64);
    await writeFile(
      join(digestMismatch.inputRoot, BOOTSTRAP_INPUT_FILE_NAMES.authorization),
      canonicalBytes(digestMismatch.authorization),
      { mode: 0o600 },
    );
    await expectBlocked(
      run(digestMismatch),
      WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.AUTHORIZATION_INVALID,
    );

    const liveAuthority = await createFixture(1);
    liveAuthority.authorization.execution_approval_authorized = true;
    await writeFile(
      join(liveAuthority.inputRoot, BOOTSTRAP_INPUT_FILE_NAMES.authorization),
      canonicalBytes(liveAuthority.authorization),
      { mode: 0o600 },
    );
    await expectBlocked(
      run(liveAuthority),
      WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.AUTHORIZATION_INVALID,
    );

    const extra = await createFixture(1);
    (extra.authorization as Record<string, unknown>).expires_at = "2026-07-16T13:00:00.000Z";
    await writeFile(
      join(extra.inputRoot, BOOTSTRAP_INPUT_FILE_NAMES.authorization),
      canonicalBytes(extra.authorization),
      { mode: 0o600 },
    );
    await expectBlocked(
      run(extra),
      WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.INPUT_SCHEMA_INVALID,
    );

    const wrongCap = await createFixture(1);
    wrongCap.authorization.record_cap = 7;
    await writeFile(
      join(wrongCap.inputRoot, BOOTSTRAP_INPUT_FILE_NAMES.authorization),
      canonicalBytes(wrongCap.authorization),
      { mode: 0o600 },
    );
    await expectBlocked(
      run(wrongCap),
      WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.AUTHORIZATION_INVALID,
    );
  });

  test.each([
    ["input mode", async (fixture: Fixture) => {
      await chmod(join(fixture.inputRoot, BOOTSTRAP_INPUT_FILE_NAMES.sourceCapture), 0o644);
    }],
    ["input symlink", async (fixture: Fixture) => {
      const path = join(fixture.inputRoot, BOOTSTRAP_INPUT_FILE_NAMES.sourceCapture);
      const original = await readFile(path);
      await rm(path);
      const target = join(fixture.root, "capture-target.json");
      await writeFile(target, original, { mode: 0o600 });
      await symlink(target, path);
    }],
    ["input hard link", async (fixture: Fixture) => {
      await link(
        join(fixture.inputRoot, BOOTSTRAP_INPUT_FILE_NAMES.sourceCapture),
        join(fixture.root, "capture-hardlink.json"),
      );
    }],
  ])("rejects unsafe %s", async (_label, mutate) => {
    const fixture = await createFixture(1);
    await mutate(fixture);
    await expectBlocked(
      run(fixture),
      WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.INPUT_FILE_INVALID,
    );
  });

  test.each([
    ["audio symlink", async (fixture: Fixture) => {
      const target = join(fixture.root, "real-audio.m4a");
      await writeFile(target, fixture.audioBytes, { mode: 0o600 });
      await rm(fixture.audioPath);
      await symlink(target, fixture.audioPath);
    }],
    ["audio hard link", async (fixture: Fixture) => {
      await link(fixture.audioPath, join(fixture.root, "audio-hardlink.m4a"));
    }],
    ["group-writable audio", async (fixture: Fixture) => {
      await chmod(fixture.audioPath, 0o620);
    }],
  ])("rejects %s substitution", async (_label, mutate) => {
    const fixture = await createFixture(1);
    await mutate(fixture);
    await expectBlocked(
      run(fixture),
      WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.AUDIO_FILE_INVALID,
    );
  });

  test("rejects an audio digest mismatch and extra asset-selection keys", async () => {
    const mismatch = await createFixture(1);
    mismatch.assetSelection.expected_sha256 = "a".repeat(64);
    await mismatch.writeInputs();
    await expectBlocked(
      run(mismatch),
      WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.AUDIO_DIGEST_MISMATCH,
    );

    const extra = await createFixture(1);
    (extra.assetSelection as Record<string, unknown>).normalized_path = extra.audioPath;
    await extra.writeInputs();
    await expectBlocked(
      run(extra),
      WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.INPUT_SCHEMA_INVALID,
    );
  });

  test("detects input tampering after validation and leaves no partial staging root", async () => {
    const fixture = await createFixture(1);
    await expectBlocked(
      run(fixture, async () => {
        fixture.sourceCapture.captured_at = "2026-07-16T10:59:59.000Z";
        await writeFile(
          join(fixture.inputRoot, BOOTSTRAP_INPUT_FILE_NAMES.sourceCapture),
          canonicalBytes(fixture.sourceCapture),
          { mode: 0o600 },
        );
      }),
      WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.INPUT_BINDING_INVALID,
    );
    await expect(lstat(join(fixture.root, "staging"))).rejects.toMatchObject({ code: "ENOENT" });
    expect((await readdir(fixture.root)).some((entry) => entry.includes(".pending-"))).toBe(false);
  });

  test("detects temporary-output tampering before atomic rename and publishes nothing", async () => {
    const fixture = await createFixture(1);
    await expectBlocked(
      run(fixture, async ({ temporaryRoot }) => {
        await writeFile(join(temporaryRoot, "unexpected-private.json"), "{}\n", {
          mode: 0o600,
        });
      }),
      WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.ATOMIC_PUBLICATION_FAILED,
    );
    await expect(lstat(join(fixture.root, "staging"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  test("round-trips source-event and observation bindings and detects staged binding tamper", async () => {
    const fixture = await createFixture(2);
    const result = await run(fixture);
    const bindings = await json(join(
      result.staging_root,
      BOOTSTRAP_STAGING_FILE_NAMES.operationBindings,
    ));
    for (const [index, binding] of bindings.operation_bindings.entries()) {
      const source = fixture.sourceCapture.ordered_records[index];
      expect(binding.source_event_anchor_sha256).toBe(
        deriveSourceEventAnchorSha256(source.source_event_reference_utf8),
      );
      expect(binding.source_observed_at).toBe(source.source_observed_at);
    }

    const tampered = await createFixture(1);
    await expectBlocked(
      run(tampered, async ({ temporaryRoot }) => {
        const path = join(temporaryRoot, BOOTSTRAP_STAGING_FILE_NAMES.operationBindings);
        const value = await json(path);
        value.operation_bindings[0].source_event_anchor_sha256 = "f".repeat(64);
        await writeFile(path, canonicalBytes(value), { mode: 0o600 });
      }),
      WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.ATOMIC_PUBLICATION_FAILED,
    );
    await expect(lstat(join(tampered.root, "staging"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  test("redacts unexpected public-boundary failures and malformed private UTF-8", async () => {
    const fixture = await createFixture(1);
    const privateMarker = `${fixture.root}/private-marker`;
    const hostileOptions = Object.defineProperty({}, "test_root", {
      enumerable: true,
      get() {
        throw new Error(privateMarker);
      },
    });
    try {
      await prepareSyntheticWelcomeAudioAuthorityBootstrapStaging(hostileOptions as never);
      throw new Error("expected hostile options to be blocked");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      const blocked = error as Error & {
        code: string;
        redacted_receipt: Record<string, unknown>;
      };
      expect(blocked.name).toBe("WelcomeAudioAuthorityBootstrapBlocked");
      expect(blocked.code).toBe(
        WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.UNEXPECTED_LOCAL_FAILURE,
      );
      expect(blocked.message).not.toContain(privateMarker);
      expect(JSON.stringify(blocked.redacted_receipt)).not.toContain(privateMarker);
    }

    const malformed = await createFixture(1);
    const malformedBytes = Buffer.from([0xc3, 0x28]);
    await writeFile(
      join(malformed.inputRoot, BOOTSTRAP_INPUT_FILE_NAMES.sourceCapture),
      malformedBytes,
      { mode: 0o600 },
    );
    malformed.authorization.source_capture_sha256 = sha256(malformedBytes);
    await writeFile(
      join(malformed.inputRoot, BOOTSTRAP_INPUT_FILE_NAMES.authorization),
      canonicalBytes(malformed.authorization),
      { mode: 0o600 },
    );
    await expectBlocked(
      run(malformed),
      WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.INPUT_JSON_INVALID,
    );

    const missingInput = await createFixture(1);
    await rm(missingInput.inputRoot, { recursive: true, force: true });
    await expectBlocked(
      run(missingInput),
      WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.ROOT_INVALID,
    );

    const callbackFailure = await createFixture(1);
    await expectBlocked(
      run(callbackFailure, async () => {
        throw new Error(`${callbackFailure.root}/private-filesystem-failure`);
      }),
      WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.ATOMIC_PUBLICATION_FAILED,
    );
    await expect(lstat(join(callbackFailure.root, "staging")))
      .rejects.toMatchObject({ code: "ENOENT" });
  });

  test("refuses an existing staging target rather than overwriting it", async () => {
    const fixture = await createFixture(1);
    const stagingRoot = join(fixture.root, "staging");
    await mkdir(stagingRoot, { mode: 0o700 });
    await writeFile(join(stagingRoot, "sentinel.json"), "{}\n", { mode: 0o600 });
    await expectBlocked(
      run(fixture),
      WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.STAGING_TARGET_EXISTS,
    );
    expect(await readdir(stagingRoot)).toEqual(["sentinel.json"]);
  });

  test("requires exactly the three fixed owner-only inputs", async () => {
    const fixture = await createFixture(1);
    await writeFile(join(fixture.inputRoot, "extra-private.json"), "{}\n", { mode: 0o600 });
    await expectBlocked(
      run(fixture),
      WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.INPUT_SCHEMA_INVALID,
    );
  });

  test("receipt validation is total for hostile getters, proxies, and revoked proxies", async () => {
    const safeInvalid = {
      ok: false,
      reason: WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.INPUT_SCHEMA_INVALID,
    };
    const privateMarker = "synthetic-private-receipt-marker";
    const hostileOwnKeys = new Proxy({}, {
      ownKeys() {
        throw new Error(privateMarker);
      },
    });
    expect(validateWelcomeAudioAuthorityBootstrapReceipt(hostileOwnKeys)).toEqual(safeInvalid);

    const fixture = await createFixture(1);
    const validReceipt = (await run(fixture)).redacted_receipt;
    const hostileGetter = { ...validReceipt } as Record<string, unknown>;
    Object.defineProperty(hostileGetter, "decision", {
      enumerable: true,
      get() {
        throw new Error(privateMarker);
      },
    });
    expect(validateWelcomeAudioAuthorityBootstrapReceipt(hostileGetter)).toEqual(safeInvalid);

    const blockerCodesProxy = {
      ...validReceipt,
      blocker_codes: new Proxy([], {
        get(_target, property) {
          if (property === "some") throw new Error(privateMarker);
          return Reflect.get(_target, property);
        },
      }),
    };
    expect(validateWelcomeAudioAuthorityBootstrapReceipt(blockerCodesProxy)).toEqual(safeInvalid);

    const revocable = Proxy.revocable({}, {});
    revocable.revoke();
    expect(validateWelcomeAudioAuthorityBootstrapReceipt(revocable.proxy)).toEqual(safeInvalid);
  });

  test("module import has zero filesystem side effects", async () => {
    const fixture = await createFixture(1);
    const before = (await readdir(fixture.root)).sort();
    const moduleUrl = pathToFileURL(join(
      process.cwd(),
      "scripts/crm-vnext-instagram-welcome-audio-authority-bundle-builder.mjs",
    ));
    moduleUrl.searchParams.set("import_side_effect_test", String(Date.now()));
    const imported = await import(moduleUrl.href);
    expect(Object.keys(imported).sort()).toEqual([
      "ASSET_SELECTION_FIELDS",
      "AUTHORIZATION_FIELDS",
      "BOOTSTRAP_INPUT_FILE_NAMES",
      "BOOTSTRAP_STAGING_FILE_NAMES",
      "CAMPAIGN_EVIDENCE_FIELDS",
      "FIXED_BOOTSTRAP_INPUT_ROOT",
      "FIXED_BOOTSTRAP_STAGING_ROOT",
      "FIXED_LIVE_AUTHORITY_ROOT",
      "FORBIDDEN_LIVE_FILE_NAME",
      "SOURCE_CAPTURE_FIELDS",
      "SOURCE_RECORD_FIELDS",
      "SYNTHETIC_TEST_ROOT_PREFIX",
      "WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_ASSET_SELECTION_SCHEMA_VERSION",
      "WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_AUTHORIZATION_SCHEMA_VERSION",
      "WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER",
      "WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_CONTRACT_VERSION",
      "WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_DECISION",
      "WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_EXECUTION_MODE",
      "WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_MAX_RECORDS",
      "WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_MISSION_ID",
      "WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_OPERATION_BINDINGS_SCHEMA_VERSION",
      "WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_RECEIPT_FIELDS",
      "WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_RECEIPT_SCHEMA_VERSION",
      "WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_SOURCE_CAPTURE_SCHEMA_VERSION",
      "WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_SOURCE_FRESHNESS_MS",
      "prepareFixedWelcomeAudioAuthorityBootstrapStaging",
      "prepareSyntheticWelcomeAudioAuthorityBootstrapStaging",
      "validateWelcomeAudioAuthorityBootstrapReceipt",
    ].sort());
    expect(Object.entries(imported)
      .filter(([, value]) => typeof value === "function")
      .map(([name]) => name)
      .sort()).toEqual([
      "prepareFixedWelcomeAudioAuthorityBootstrapStaging",
      "prepareSyntheticWelcomeAudioAuthorityBootstrapStaging",
      "validateWelcomeAudioAuthorityBootstrapReceipt",
    ]);
    expect((await readdir(fixture.root)).sort()).toEqual(before);
    await expect(lstat(join(fixture.root, "staging"))).rejects.toMatchObject({ code: "ENOENT" });
  });
});
