import { describe, expect, test } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const repoRoot = path.resolve(".");
const cli = path.join(repoRoot, "scripts/crm-vnext-central-integration-lock.mjs");
const goodSha = "0123456789abcdef0123456789abcdef01234567";
const dedicatedMode = "dedicated_clean_checkout_v1";

function tmpDir(label = "crm-core-central-lock-") {
  return fs.mkdtempSync(path.join("/tmp", label));
}

function baseEnv(extra: Record<string, string | undefined> = {}) {
  return {
    PATH: process.env.PATH || "",
    HOME: process.env.HOME || os.homedir(),
    NODE_ENV: "test",
    ...extra,
  };
}

function rawChatUrlPattern() {
  return "https://" + "chatgpt.com" + "/c/" + "synthetic";
}

function mockedApprovedRoot() {
  return path.join(
    tmpDir("mock-approved-root-"),
    "Users",
    "alejandrogomez",
    "Documents",
    "CRM-Core-Reports",
    "central-integration",
  );
}

function runGit(cwd: string, args: string[]) {
  return execFileSync("git", ["-C", cwd, ...args], {
    encoding: "utf8",
    env: baseEnv(),
  }).trim();
}

function syntheticDedicatedCheckout() {
  const root = tmpDir("central-dedicated-checkout-");
  const canonical = path.join(root, "canonical");
  const dedicated = path.join(root, "dedicated");
  fs.mkdirSync(canonical, { recursive: true });
  runGit(canonical, ["init", "-b", "codex/crm-core-reentry"]);
  runGit(canonical, ["config", "user.name", "CRM Core Test"]);
  runGit(canonical, ["config", "user.email", "crm-core-test.invalid"]);
  fs.writeFileSync(path.join(canonical, "fixture.txt"), "synthetic\n");
  runGit(canonical, ["add", "fixture.txt"]);
  runGit(canonical, ["commit", "-m", "synthetic central"]);
  const centralBaseSha = runGit(canonical, ["rev-parse", "HEAD"]);
  runGit(canonical, [
    "update-ref",
    "refs/remotes/origin/codex/crm-core-reentry",
    centralBaseSha,
  ]);
  runGit(canonical, ["worktree", "add", "--detach", dedicated, centralBaseSha]);
  return { root, canonical, dedicated, centralBaseSha };
}

function dedicatedEnv(
  fixture: ReturnType<typeof syntheticDedicatedCheckout>,
  dedicatedPath = fixture.dedicated,
) {
  return {
    CRM_CORE_CENTRAL_INTEGRATION_CANONICAL_REPO_ROOT: fixture.canonical,
    CRM_CORE_CENTRAL_INTEGRATION_DEDICATED_CHECKOUT: dedicatedPath,
  };
}

function runCli(
  args: string[],
  extraEnv: Record<string, string | undefined> = {},
) {
  return spawnSync(process.execPath, [cli, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    env: baseEnv(extraEnv),
  });
}

function jsonFrom(result: ReturnType<typeof runCli>) {
  const text = result.stdout.trim();
  expect(text).not.toEqual("");
  return JSON.parse(text);
}

function acquireArgs(lockDir: string, overrides: Record<string, string> = {}) {
  const values: Record<string, string> = {
    ownerId: "instagram-api-readiness",
    branch: "codex/crm-core-reentry",
    worktree: "/Users/alejandrogomez/CRM-core",
    integrationPacketId: "crm_core_test_central_packet",
    sourceWorkstream: "instagram-api-readiness",
    sourceBranch: "codex/crm-core-instagram-api",
    sourceCommitSha: goodSha,
    chiefArchitectPacketId: "crm_core_test_chief_architect_packet",
    chiefArchitectVerdict: "green_to_self_integrate",
    criticalSection: "central_integration_run",
    lockDir,
    ttlMs: "3600000",
    ...overrides,
  };
  const args = [
    "acquire",
    "--owner-id",
    values.ownerId,
    "--branch",
    values.branch,
    "--worktree",
    values.worktree,
    "--integration-packet-id",
    values.integrationPacketId,
    "--source-workstream",
    values.sourceWorkstream,
    "--source-branch",
    values.sourceBranch,
    "--source-commit-sha",
    values.sourceCommitSha,
    "--chief-architect-packet-id",
    values.chiefArchitectPacketId,
    "--chief-architect-verdict",
    values.chiefArchitectVerdict,
    "--critical-section",
    values.criticalSection,
    "--ttl-ms",
    values.ttlMs,
    "--lock-dir",
    values.lockDir,
  ];
  if (values.worktreeMode) {
    args.push("--worktree-mode", values.worktreeMode);
  }
  if (values.centralBaseSha) {
    args.push("--central-base-sha", values.centralBaseSha);
  }
  return args;
}

function dedicatedAcquireArgs(
  lockDir: string,
  fixture: ReturnType<typeof syntheticDedicatedCheckout>,
  overrides: Record<string, string> = {},
) {
  return acquireArgs(lockDir, {
    worktree: fixture.dedicated,
    worktreeMode: dedicatedMode,
    centralBaseSha: fixture.centralBaseSha,
    ...overrides,
  });
}

function writeLock(lockDir: string, metadata: Record<string, unknown>) {
  fs.mkdirSync(lockDir, { recursive: true });
  fs.writeFileSync(
    path.join(lockDir, "lock.json"),
    `${JSON.stringify(metadata, null, 2)}\n`,
  );
}

function heldMetadata(overrides: Record<string, unknown> = {}) {
  return {
    lock_version: "v0",
    owner_id: "held-owner",
    branch: "codex/crm-core-reentry",
    worktree: "/Users/alejandrogomez/CRM-core",
    integration_packet_id: "held_packet",
    source_workstream: "instagram-api-readiness",
    source_branch: "codex/crm-core-instagram-api",
    source_commit_sha: goodSha,
    chief_architect_packet_id: "held_chief_packet",
    chief_architect_verdict: "green_to_self_integrate",
    critical_section: "central_integration_run",
    acquired_at: new Date(Date.now() - 1000).toISOString(),
    expires_at: new Date(Date.now() + 3600000).toISOString(),
    owner_token_hash: "not-a-real-token-hash",
    raw_target_url_printed: false,
    owner_token_recorded_in_receipt: false,
    ...overrides,
  };
}

test("acquire creates lock directory and redacted lock.json", () => {
  const lockDir = path.join(tmpDir(), "missing", ".central-integration-lock");
  const result = runCli(acquireArgs(lockDir));
  const payload = jsonFrom(result);
  expect(result.status).toBe(0);
  expect(payload.ok).toBe(true);
  expect(payload.acquired).toBe(true);
  expect(fs.existsSync(lockDir)).toBe(true);
  const metadata = JSON.parse(
    fs.readFileSync(path.join(lockDir, "lock.json"), "utf8"),
  );
  expect(metadata.lock_version).toBe("v0");
  expect(metadata.owner_token_hash).toEqual(expect.any(String));
  expect(metadata.owner_token).toBeUndefined();
  expect(metadata.raw_target_url_printed).toBe(false);
});

test("acquire stdout includes owner_token but lock.json stores only owner_token_hash", () => {
  const lockDir = path.join(tmpDir(), ".central-integration-lock");
  const payload = jsonFrom(runCli(acquireArgs(lockDir)));
  const metadata = JSON.parse(
    fs.readFileSync(path.join(lockDir, "lock.json"), "utf8"),
  );
  expect(payload.owner_token).toEqual(expect.any(String));
  expect(metadata.owner_token_hash).toEqual(expect.any(String));
  expect(JSON.stringify(metadata)).not.toContain(payload.owner_token);
});

test("second acquire fails while lock is held", () => {
  const lockDir = path.join(tmpDir(), ".central-integration-lock");
  expect(runCli(acquireArgs(lockDir)).status).toBe(0);
  const second = runCli(acquireArgs(lockDir));
  const payload = jsonFrom(second);
  expect(second.status).not.toBe(0);
  expect(payload.locked).toBe(true);
  expect(payload.acquired).toBe(false);
});

test("status reports held lock and redacted metadata", () => {
  const lockDir = path.join(tmpDir(), ".central-integration-lock");
  expect(runCli(acquireArgs(lockDir)).status).toBe(0);
  const status = jsonFrom(runCli(["status", "--lock-dir", lockDir]));
  expect(status.locked).toBe(true);
  expect(status.metadata.owner_id).toBe("instagram-api-readiness");
  expect(status.owner_token_hash_present).toBe(true);
  expect(status).not.toHaveProperty("owner_token");
});

test("release with wrong token fails and keeps lock", () => {
  const lockDir = path.join(tmpDir(), ".central-integration-lock");
  expect(runCli(acquireArgs(lockDir)).status).toBe(0);
  const release = runCli(["release", "--owner-token", "wrong", "--lock-dir", lockDir]);
  const payload = jsonFrom(release);
  expect(release.status).not.toBe(0);
  expect(payload.error).toBe("owner_token_mismatch");
  expect(fs.existsSync(lockDir)).toBe(true);
});

test("release with correct token removes lock", () => {
  const lockDir = path.join(tmpDir(), ".central-integration-lock");
  const acquire = jsonFrom(runCli(acquireArgs(lockDir)));
  const release = runCli([
    "release",
    "--owner-token",
    acquire.owner_token,
    "--lock-dir",
    lockDir,
  ]);
  const payload = jsonFrom(release);
  expect(release.status).toBe(0);
  expect(payload.released).toBe(true);
  expect(fs.existsSync(lockDir)).toBe(false);
});

test("stale lock is reported as stale but not automatically broken", () => {
  const lockDir = path.join(tmpDir(), ".central-integration-lock");
  writeLock(
    lockDir,
    heldMetadata({ expires_at: new Date(Date.now() - 1000).toISOString() }),
  );
  const status = jsonFrom(runCli(["status", "--lock-dir", lockDir]));
  expect(status.stale).toBe(true);
  const acquire = runCli(acquireArgs(lockDir));
  const payload = jsonFrom(acquire);
  expect(acquire.status).not.toBe(0);
  expect(payload.stale).toBe(true);
  expect(fs.existsSync(lockDir)).toBe(true);
});

test("acquire rejects raw ChatGPT target URL patterns in arguments", () => {
  const lockDir = path.join(tmpDir(), ".central-integration-lock");
  const unsafe = rawChatUrlPattern();
  const result = runCli(acquireArgs(lockDir, { ownerId: unsafe }));
  expect(result.status).not.toBe(0);
  expect(result.stdout).not.toContain(unsafe);
});

test("status redacts unsafe existing lock metadata", () => {
  const lockDir = path.join(tmpDir(), ".central-integration-lock");
  const unsafeUrl = rawChatUrlPattern();
  writeLock(
    lockDir,
    heldMetadata({
      owner_id: unsafeUrl,
      source_workstream: "person@example.com",
      source_branch: "Mantis-Reports",
      integration_packet_id: "/Users/alejandrogomez/CRM/something",
    }),
  );
  const status = jsonFrom(runCli(["status", "--lock-dir", lockDir]));
  const rendered = JSON.stringify(status);
  expect(status.metadata_redaction_status).toBe("unsafe_metadata_redacted");
  expect(rendered).toContain("[redacted_unsafe_metadata]");
  expect(rendered).not.toContain(unsafeUrl);
  expect(rendered).not.toContain("person@example.com");
  expect(rendered).not.toContain("Mantis-Reports");
});

test("acquire failure redacts unsafe existing lock metadata", () => {
  const lockDir = path.join(tmpDir(), ".central-integration-lock");
  const unsafeUrl = rawChatUrlPattern();
  writeLock(lockDir, heldMetadata({ owner_id: unsafeUrl }));
  const result = runCli(acquireArgs(lockDir));
  const rendered = result.stdout;
  expect(result.status).not.toBe(0);
  expect(rendered).toContain("[redacted_unsafe_metadata]");
  expect(rendered).not.toContain(unsafeUrl);
});

test("acquire creates missing parent directory under /tmp", () => {
  const lockDir = path.join(tmpDir(), "a", "b", ".central-integration-lock");
  expect(fs.existsSync(path.dirname(lockDir))).toBe(false);
  expect(runCli(acquireArgs(lockDir)).status).toBe(0);
  expect(fs.existsSync(lockDir)).toBe(true);
});

test("production mode rejects arbitrary /tmp lock dir before mkdir", () => {
  const lockDir = path.join(tmpDir("central-lock-prod-"), ".central-integration-lock");
  const result = runCli(acquireArgs(lockDir), { NODE_ENV: "production" });
  expect(result.status).not.toBe(0);
  expect(fs.existsSync(lockDir)).toBe(false);
});

test("production mode rejects Mantis-Reports lock dir before mkdir", () => {
  const lockDir =
    "/Users/alejandrogomez/Documents/Mantis-Reports/central/.central-integration-lock";
  const result = runCli(acquireArgs(lockDir), { NODE_ENV: "production" });
  expect(result.status).not.toBe(0);
});

test("production mode rejects Mantis-Private-Source-Artifacts lock dir before mkdir", () => {
  const lockDir =
    "/Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts/central/.central-integration-lock";
  const result = runCli(acquireArgs(lockDir), { NODE_ENV: "production" });
  expect(result.status).not.toBe(0);
});

test("production mode rejects CRM-Core-Private-Artifacts lock dir before mkdir", () => {
  const lockDir =
    "/Users/alejandrogomez/Documents/CRM-Core-Private-Artifacts/central/.central-integration-lock";
  const result = runCli(acquireArgs(lockDir), { NODE_ENV: "production" });
  expect(result.status).not.toBe(0);
});

test("production mode rejects /Users/alejandrogomez/CRM lock dir before mkdir", () => {
  const lockDir = "/Users/alejandrogomez/CRM/.central-integration-lock";
  const result = runCli(acquireArgs(lockDir), { NODE_ENV: "production" });
  expect(result.status).not.toBe(0);
});

test("production mode rejects lock-dir with Launch OS / OpenClaw fragments", () => {
  const launchDir =
    "/Users/alejandrogomez/Documents/CRM-Core-Reports/central-integration/Launch OS/.central-integration-lock";
  const openclawDir =
    "/Users/alejandrogomez/Documents/CRM-Core-Reports/central-integration/openclaw/.central-integration-lock";
  expect(runCli(acquireArgs(launchDir), { NODE_ENV: "production" }).status).not.toBe(0);
  expect(runCli(acquireArgs(openclawDir), { NODE_ENV: "production" }).status).not.toBe(0);
});

test("production mode rejects email-like value in lock-dir before mkdir", () => {
  const lockDir =
    "/Users/alejandrogomez/Documents/CRM-Core-Reports/central-integration/person@example.com/.central-integration-lock";
  const result = runCli(acquireArgs(lockDir), { NODE_ENV: "production" });
  expect(result.status).not.toBe(0);
});

test("test mode can enforce mocked approved CRM-Core-Reports central-integration root", () => {
  const root = mockedApprovedRoot();
  const inside = path.join(root, ".central-integration-lock");
  const outside = path.join(path.dirname(root), "other", ".central-integration-lock");
  const env = { CRM_CORE_CENTRAL_INTEGRATION_APPROVED_ROOT: root };
  expect(runCli(acquireArgs(inside), env).status).toBe(0);
  const rejected = runCli(acquireArgs(outside), env);
  expect(rejected.status).not.toBe(0);
  expect(fs.existsSync(outside)).toBe(false);
});

test("test mode rejects mocked approved root itself as lock dir", () => {
  const root = mockedApprovedRoot();
  const env = { CRM_CORE_CENTRAL_INTEGRATION_APPROVED_ROOT: root };
  const result = runCli(acquireArgs(root), env);
  const payload = jsonFrom(result);
  expect(result.status).not.toBe(0);
  expect(payload.error).toMatch(
    /^(lock_dir_approved_root_itself_rejected|unsafe_lock_dir_rejected)$/,
  );
  expect(result.stdout).not.toContain(root);
  expect(fs.existsSync(path.join(root, "lock.json"))).toBe(false);
  expect(fs.existsSync(path.join(root, ".central-integration-lock"))).toBe(false);
});

test("test mode allows mocked approved root child lock dir", () => {
  const root = mockedApprovedRoot();
  const lockDir = path.join(root, ".central-integration-lock");
  const env = { CRM_CORE_CENTRAL_INTEGRATION_APPROVED_ROOT: root };
  const acquire = jsonFrom(runCli(acquireArgs(lockDir), env));
  expect(acquire.ok).toBe(true);
  expect(fs.existsSync(lockDir)).toBe(true);
  expect(fs.existsSync(path.join(lockDir, "lock.json"))).toBe(true);
  const release = jsonFrom(
    runCli(["release", "--owner-token", acquire.owner_token, "--lock-dir", lockDir], env),
  );
  expect(release.ok).toBe(true);
  expect(fs.existsSync(root)).toBe(true);
  expect(fs.existsSync(lockDir)).toBe(false);
});

test("release removes only child lock dir and preserves mocked approved root", () => {
  const root = mockedApprovedRoot();
  const lockDir = path.join(root, ".central-integration-lock");
  const env = { CRM_CORE_CENTRAL_INTEGRATION_APPROVED_ROOT: root };
  const acquire = jsonFrom(runCli(acquireArgs(lockDir), env));
  expect(fs.existsSync(root)).toBe(true);
  expect(fs.existsSync(lockDir)).toBe(true);
  const release = runCli(
    ["release", "--owner-token", acquire.owner_token, "--lock-dir", lockDir],
    env,
  );
  expect(release.status).toBe(0);
  expect(fs.existsSync(root)).toBe(true);
  expect(fs.existsSync(lockDir)).toBe(false);
});

test("acquire rejects non-central branch", () => {
  const lockDir = path.join(tmpDir(), ".central-integration-lock");
  expect(runCli(acquireArgs(lockDir, { branch: "codex/not-central" })).status).not.toBe(0);
});

test("acquire rejects non-central worktree", () => {
  const lockDir = path.join(tmpDir(), ".central-integration-lock");
  expect(runCli(acquireArgs(lockDir, { worktree: "/tmp/not-crm-core" })).status).not.toBe(0);
});

test("dedicated clean checkout acquires only after environment-owned Git checks", () => {
  const fixture = syntheticDedicatedCheckout();
  const lockDir = path.join(tmpDir(), ".central-integration-lock");
  const result = runCli(
    dedicatedAcquireArgs(lockDir, fixture),
    dedicatedEnv(fixture),
  );
  const payload = jsonFrom(result);
  expect(result.status).toBe(0);
  expect(payload.worktree_mode).toBe(dedicatedMode);
  expect(payload.central_base_sha).toBe(fixture.centralBaseSha);
  const metadata = JSON.parse(
    fs.readFileSync(path.join(lockDir, "lock.json"), "utf8"),
  );
  expect(metadata.worktree_mode).toBe(dedicatedMode);
  expect(metadata.central_base_sha).toBe(fixture.centralBaseSha);
  expect(metadata.owner_token).toBeUndefined();
});

test("dedicated checkout rejects a non-detached branch", () => {
  const fixture = syntheticDedicatedCheckout();
  runGit(fixture.dedicated, ["switch", "-c", "synthetic-not-detached"]);
  const lockDir = path.join(tmpDir(), ".central-integration-lock");
  const result = runCli(
    dedicatedAcquireArgs(lockDir, fixture),
    dedicatedEnv(fixture),
  );
  expect(result.status).not.toBe(0);
  expect(jsonFrom(result).error).toBe("dedicated_checkout_not_detached");
  expect(fs.existsSync(lockDir)).toBe(false);
});

test("dedicated checkout rejects dirty or untracked state", () => {
  const fixture = syntheticDedicatedCheckout();
  fs.writeFileSync(path.join(fixture.dedicated, "untracked.txt"), "blocked\n");
  const lockDir = path.join(tmpDir(), ".central-integration-lock");
  const result = runCli(
    dedicatedAcquireArgs(lockDir, fixture),
    dedicatedEnv(fixture),
  );
  expect(result.status).not.toBe(0);
  expect(jsonFrom(result).error).toBe("dedicated_checkout_not_clean");
  expect(fs.existsSync(lockDir)).toBe(false);
});

test("dedicated checkout rejects central upstream drift", () => {
  const fixture = syntheticDedicatedCheckout();
  fs.writeFileSync(path.join(fixture.canonical, "fixture.txt"), "drifted\n");
  runGit(fixture.canonical, ["add", "fixture.txt"]);
  runGit(fixture.canonical, ["commit", "-m", "synthetic drift"]);
  const driftedSha = runGit(fixture.canonical, ["rev-parse", "HEAD"]);
  runGit(fixture.canonical, [
    "update-ref",
    "refs/remotes/origin/codex/crm-core-reentry",
    driftedSha,
  ]);
  const lockDir = path.join(tmpDir(), ".central-integration-lock");
  const result = runCli(
    dedicatedAcquireArgs(lockDir, fixture),
    dedicatedEnv(fixture),
  );
  expect(result.status).not.toBe(0);
  expect(jsonFrom(result).error).toBe("dedicated_checkout_upstream_mismatch");
  expect(fs.existsSync(lockDir)).toBe(false);
});

test("dedicated checkout rejects a symlinked admission path", () => {
  const fixture = syntheticDedicatedCheckout();
  const symlinkPath = path.join(fixture.root, "dedicated-symlink");
  fs.symlinkSync(fixture.dedicated, symlinkPath);
  const lockDir = path.join(tmpDir(), ".central-integration-lock");
  const result = runCli(
    dedicatedAcquireArgs(lockDir, fixture, { worktree: symlinkPath }),
    dedicatedEnv(fixture, symlinkPath),
  );
  expect(result.status).not.toBe(0);
  expect(jsonFrom(result).error).toBe("dedicated_checkout_symlink_rejected");
  expect(fs.existsSync(lockDir)).toBe(false);
});

test("dedicated checkout rejects a different repository", () => {
  const canonicalFixture = syntheticDedicatedCheckout();
  const otherFixture = syntheticDedicatedCheckout();
  const lockDir = path.join(tmpDir(), ".central-integration-lock");
  const result = runCli(
    dedicatedAcquireArgs(lockDir, otherFixture),
    {
      CRM_CORE_CENTRAL_INTEGRATION_CANONICAL_REPO_ROOT:
        canonicalFixture.canonical,
      CRM_CORE_CENTRAL_INTEGRATION_DEDICATED_CHECKOUT:
        otherFixture.dedicated,
    },
  );
  expect(result.status).not.toBe(0);
  expect(jsonFrom(result).error).toBe(
    "dedicated_checkout_repository_mismatch",
  );
  expect(fs.existsSync(lockDir)).toBe(false);
});

test("dedicated checkout rejects malformed central base SHA", () => {
  const fixture = syntheticDedicatedCheckout();
  const lockDir = path.join(tmpDir(), ".central-integration-lock");
  const result = runCli(
    dedicatedAcquireArgs(lockDir, fixture, {
      centralBaseSha: "not-a-sha",
    }),
    dedicatedEnv(fixture),
  );
  expect(result.status).not.toBe(0);
  expect(jsonFrom(result).error).toBe(
    "malformed_central_base_sha_rejected",
  );
  expect(fs.existsSync(lockDir)).toBe(false);
});

test("dedicated checkout rejects an alternate spelling of the allowlisted path", () => {
  const fixture = syntheticDedicatedCheckout();
  const alternatePath = `${fixture.root}/./dedicated`;
  const lockDir = path.join(tmpDir(), ".central-integration-lock");
  const result = runCli(
    dedicatedAcquireArgs(lockDir, fixture, { worktree: alternatePath }),
    dedicatedEnv(fixture),
  );
  expect(result.status).not.toBe(0);
  expect(jsonFrom(result).error).toBe("dedicated_checkout_path_rejected");
  expect(fs.existsSync(lockDir)).toBe(false);
});

test("canonical mode rejects dedicated-only central base metadata", () => {
  const lockDir = path.join(tmpDir(), ".central-integration-lock");
  const result = runCli(
    acquireArgs(lockDir, { centralBaseSha: goodSha }),
  );
  expect(result.status).not.toBe(0);
  expect(jsonFrom(result).error).toBe(
    "canonical_worktree_central_base_sha_rejected",
  );
  expect(fs.existsSync(lockDir)).toBe(false);
});

test("acquire rejects an unknown worktree mode", () => {
  const lockDir = path.join(tmpDir(), ".central-integration-lock");
  const result = runCli(
    acquireArgs(lockDir, { worktreeMode: "unknown_mode" }),
  );
  expect(result.status).not.toBe(0);
  expect(jsonFrom(result).error).toBe("unknown_worktree_mode_rejected");
  expect(fs.existsSync(lockDir)).toBe(false);
});

test("acquire rejects non-green Chief Architect verdict", () => {
  const lockDir = path.join(tmpDir(), ".central-integration-lock");
  const result = runCli(
    acquireArgs(lockDir, { chiefArchitectVerdict: "central_decision_needed" }),
  );
  expect(result.status).not.toBe(0);
});

test("acquire rejects malformed source commit SHA", () => {
  const lockDir = path.join(tmpDir(), ".central-integration-lock");
  expect(runCli(acquireArgs(lockDir, { sourceCommitSha: "not-a-sha" })).status).not.toBe(0);
});

test("status output does not print owner_token_hash value", () => {
  const lockDir = path.join(tmpDir(), ".central-integration-lock");
  expect(runCli(acquireArgs(lockDir)).status).toBe(0);
  const metadata = JSON.parse(
    fs.readFileSync(path.join(lockDir, "lock.json"), "utf8"),
  );
  const status = runCli(["status", "--lock-dir", lockDir]);
  expect(status.stdout).not.toContain(metadata.owner_token_hash);
  expect(status.stdout).not.toContain('"owner_token_hash"');
  expect(status.stdout).toContain('"owner_token_hash_present"');
});

test("lock metadata never contains raw target URL, owner token, private content, or Mantis paths", () => {
  const lockDir = path.join(tmpDir(), ".central-integration-lock");
  const acquire = jsonFrom(runCli(acquireArgs(lockDir)));
  const metadataText = fs.readFileSync(path.join(lockDir, "lock.json"), "utf8");
  expect(metadataText).not.toContain(rawChatUrlPattern());
  expect(metadataText).not.toContain(acquire.owner_token);
  expect(metadataText).not.toContain("owner_token\":");
  expect(metadataText).not.toContain("Mantis-Reports");
  expect(metadataText).not.toContain("Mantis-Private-Source-Artifacts");
  expect(metadataText).not.toContain("CRM-Core-Private-Artifacts");
});
