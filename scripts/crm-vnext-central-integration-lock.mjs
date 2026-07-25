#!/usr/bin/env node

import crypto from "node:crypto";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const PROD_ROOT =
  "/Users/alejandrogomez/Documents/CRM-Core-Reports/central-integration";
const DEFAULT_LOCK_DIR = path.join(PROD_ROOT, ".central-integration-lock");
const REPO_ROOT = "/Users/alejandrogomez/CRM-core";
const DEDICATED_CLEAN_CHECKOUT =
  "/Users/alejandrogomez/CRM-core-central-integration";
const LEGACY_CRM_ROOT = "/Users/alejandrogomez/CRM";
const MANTIS_REPORTS = "/Users/alejandrogomez/Documents/Mantis-Reports";
const MANTIS_PRIVATE =
  "/Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts";
const CRM_CORE_PRIVATE =
  "/Users/alejandrogomez/Documents/CRM-Core-Private-Artifacts";
const RAW_TARGET_PATTERNS = [
  "chatgpt.com" + "/c/",
  "chat.openai.com" + "/c/",
];
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const SOURCE_SHA_RE = /^[a-f0-9]{40}$/i;
const CENTRAL_BRANCH = "codex/crm-core-reentry";
const CANONICAL_WORKTREE_MODE = "canonical_worktree_v0";
const DEDICATED_CLEAN_CHECKOUT_MODE = "dedicated_clean_checkout_v1";
const execFileAsync = promisify(execFile);
const ALLOWED_CRITICAL_SECTIONS = new Set([
  "central_integration_run",
  "central_preflight",
  "central_fetch_merge",
  "central_coordination_update",
  "central_commit_push",
  "lane_fast_forward",
  "central_release_cleanup",
  "other_central_integration_critical_section",
]);
const SAFE_METADATA_FIELDS = [
  "lock_version",
  "owner_id",
  "branch",
  "worktree",
  "worktree_mode",
  "central_base_sha",
  "integration_packet_id",
  "source_workstream",
  "source_branch",
  "source_commit_sha",
  "chief_architect_packet_id",
  "chief_architect_verdict",
  "critical_section",
  "acquired_at",
  "expires_at",
  "raw_target_url_printed",
  "owner_token_recorded_in_receipt",
];

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const args = {};
  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    if (!arg.startsWith("--")) {
      throw safeError("invalid_argument_format");
    }
    const key = arg.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const value = rest[i + 1];
    if (!value || value.startsWith("--")) {
      throw safeError("missing_argument_value");
    }
    args[key] = value;
    i += 1;
  }
  return { command, args };
}

function safeError(code) {
  const err = new Error(code);
  err.safeCode = code;
  return err;
}

function jsonOut(payload, exitCode = 0) {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  process.exitCode = exitCode;
}

function isTestMode() {
  return process.env.NODE_ENV === "test";
}

function normalizeFsPath(value) {
  return path.resolve(String(value || ""));
}

function isInside(child, parent) {
  const rel = path.relative(parent, child);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

function isSamePath(a, b) {
  return normalizeFsPath(a) === normalizeFsPath(b);
}

function dedicatedCleanCheckoutPath() {
  if (
    isTestMode() &&
    process.env.CRM_CORE_CENTRAL_INTEGRATION_DEDICATED_CHECKOUT
  ) {
    return normalizeFsPath(
      process.env.CRM_CORE_CENTRAL_INTEGRATION_DEDICATED_CHECKOUT,
    );
  }
  return DEDICATED_CLEAN_CHECKOUT;
}

function canonicalRepoRootForValidation() {
  if (
    isTestMode() &&
    process.env.CRM_CORE_CENTRAL_INTEGRATION_CANONICAL_REPO_ROOT
  ) {
    return normalizeFsPath(
      process.env.CRM_CORE_CENTRAL_INTEGRATION_CANONICAL_REPO_ROOT,
    );
  }
  return REPO_ROOT;
}

function containsRawTargetPattern(value) {
  const text = String(value || "").toLowerCase();
  return RAW_TARGET_PATTERNS.some((pattern) => text.includes(pattern));
}

function containsForbiddenFragment(value) {
  const text = String(value || "");
  return /launch os|launch-os|openclaw/i.test(text);
}

function containsUnsafeMetadataValue(value) {
  const text = String(value ?? "");
  if (containsRawTargetPattern(text)) return true;
  if (text.includes("Mantis-Reports")) return true;
  if (text.includes("Mantis-Private-Source-Artifacts")) return true;
  if (text.includes("CRM-Core-Private-Artifacts")) return true;
  if (containsForbiddenFragment(text)) return true;
  if (EMAIL_RE.test(text)) return true;
  if (
    text.includes(LEGACY_CRM_ROOT) &&
    text !== REPO_ROOT &&
    text !== dedicatedCleanCheckoutPath()
  ) {
    return true;
  }
  return false;
}

function assertSafeScalar(value, code = "unsafe_argument_rejected") {
  const text = String(value ?? "");
  if (containsRawTargetPattern(text)) throw safeError(code);
  if (EMAIL_RE.test(text)) throw safeError(code);
  if (text.includes("Mantis-Reports")) throw safeError(code);
  if (text.includes("Mantis-Private-Source-Artifacts")) throw safeError(code);
  if (text.includes("CRM-Core-Private-Artifacts")) throw safeError(code);
  if (containsForbiddenFragment(text)) throw safeError(code);
  if (
    text.includes(LEGACY_CRM_ROOT) &&
    text !== REPO_ROOT &&
    text !== dedicatedCleanCheckoutPath()
  ) {
    throw safeError(code);
  }
}

function validateAllArgumentValues(args) {
  for (const [key, value] of Object.entries(args)) {
    if (key === "lockDir") continue;
    assertSafeScalar(value);
  }
}

function resolveLockDir(args) {
  return normalizeFsPath(
    args.lockDir ||
      process.env.CRM_CORE_CENTRAL_INTEGRATION_LOCK_DIR ||
      DEFAULT_LOCK_DIR,
  );
}

function validateLockDir(lockDir) {
  const normalized = normalizeFsPath(lockDir);
  const text = String(lockDir || "");
  if (containsRawTargetPattern(text) || EMAIL_RE.test(text)) {
    throw safeError("unsafe_lock_dir_rejected");
  }
  if (containsForbiddenFragment(text)) {
    throw safeError("unsafe_lock_dir_rejected");
  }
  if (isInside(normalized, REPO_ROOT)) {
    throw safeError("unsafe_lock_dir_rejected");
  }
  if (isInside(normalized, MANTIS_REPORTS)) {
    throw safeError("unsafe_lock_dir_rejected");
  }
  if (isInside(normalized, MANTIS_PRIVATE)) {
    throw safeError("unsafe_lock_dir_rejected");
  }
  if (isInside(normalized, CRM_CORE_PRIVATE)) {
    throw safeError("unsafe_lock_dir_rejected");
  }
  if (isInside(normalized, LEGACY_CRM_ROOT) && !isInside(normalized, REPO_ROOT)) {
    throw safeError("unsafe_lock_dir_rejected");
  }

  if (isTestMode()) {
    const approvedRoot = process.env.CRM_CORE_CENTRAL_INTEGRATION_APPROVED_ROOT
      ? normalizeFsPath(process.env.CRM_CORE_CENTRAL_INTEGRATION_APPROVED_ROOT)
      : null;
    if (!isInside(normalized, "/tmp")) {
      throw safeError("unsafe_lock_dir_rejected");
    }
    if (approvedRoot) {
      if (isSamePath(normalized, approvedRoot)) {
        throw safeError("lock_dir_approved_root_itself_rejected");
      }
      if (!isInside(approvedRoot, "/tmp") || !isInside(normalized, approvedRoot)) {
        throw safeError("unsafe_lock_dir_rejected");
      }
    }
    return normalized;
  }

  if (isSamePath(normalized, PROD_ROOT)) {
    throw safeError("lock_dir_approved_root_itself_rejected");
  }
  if (!isInside(normalized, PROD_ROOT)) {
    throw safeError("unsafe_lock_dir_rejected");
  }
  return normalized;
}

function requireArg(args, key) {
  const value = args[key];
  if (!value) throw safeError(`missing_${key}`);
  return value;
}

function validateAcquireArgs(args) {
  const required = [
    "ownerId",
    "branch",
    "worktree",
    "integrationPacketId",
    "sourceWorkstream",
    "sourceBranch",
    "sourceCommitSha",
    "chiefArchitectPacketId",
    "chiefArchitectVerdict",
    "criticalSection",
  ];
  for (const key of required) requireArg(args, key);
  validateAllArgumentValues(args);
  if (args.branch !== CENTRAL_BRANCH) {
    throw safeError("non_central_branch_rejected");
  }
  const worktreeMode = args.worktreeMode || CANONICAL_WORKTREE_MODE;
  if (
    ![CANONICAL_WORKTREE_MODE, DEDICATED_CLEAN_CHECKOUT_MODE].includes(
      worktreeMode,
    )
  ) {
    throw safeError("unknown_worktree_mode_rejected");
  }
  if (
    worktreeMode === CANONICAL_WORKTREE_MODE &&
    args.worktree !== REPO_ROOT
  ) {
    throw safeError("non_central_worktree_rejected");
  }
  if (worktreeMode === CANONICAL_WORKTREE_MODE && args.centralBaseSha) {
    throw safeError("canonical_worktree_central_base_sha_rejected");
  }
  if (worktreeMode === DEDICATED_CLEAN_CHECKOUT_MODE) {
    if (args.worktree !== dedicatedCleanCheckoutPath()) {
      throw safeError("dedicated_checkout_path_rejected");
    }
    if (!SOURCE_SHA_RE.test(args.centralBaseSha || "")) {
      throw safeError("malformed_central_base_sha_rejected");
    }
  }
  if (!SOURCE_SHA_RE.test(args.sourceCommitSha)) {
    throw safeError("malformed_source_commit_sha_rejected");
  }
  if (args.chiefArchitectVerdict !== "green_to_self_integrate") {
    throw safeError("non_green_chief_architect_verdict_rejected");
  }
  if (!ALLOWED_CRITICAL_SECTIONS.has(args.criticalSection)) {
    throw safeError("unknown_critical_section_rejected");
  }
}

async function gitValue(worktree, gitArgs, errorCode) {
  try {
    const { stdout } = await execFileAsync(
      "git",
      ["-C", worktree, ...gitArgs],
      {
        encoding: "utf8",
        env: {
          PATH: process.env.PATH || "",
          HOME: process.env.HOME || "",
        },
      },
    );
    return stdout.trim();
  } catch {
    throw safeError(errorCode);
  }
}

async function gitCommonDir(worktree) {
  const raw = await gitValue(
    worktree,
    ["rev-parse", "--git-common-dir"],
    "dedicated_checkout_git_common_dir_unavailable",
  );
  try {
    return await fs.realpath(path.resolve(worktree, raw));
  } catch {
    throw safeError("dedicated_checkout_git_common_dir_unavailable");
  }
}

async function validateDedicatedCheckout(args) {
  const worktree = dedicatedCleanCheckoutPath();
  let worktreeStat;
  try {
    worktreeStat = await fs.lstat(worktree);
  } catch {
    throw safeError("dedicated_checkout_missing");
  }
  if (worktreeStat.isSymbolicLink()) {
    throw safeError("dedicated_checkout_symlink_rejected");
  }

  try {
    await fs.realpath(worktree);
  } catch {
    throw safeError("dedicated_checkout_realpath_unavailable");
  }

  const canonicalRoot = canonicalRepoRootForValidation();
  const [dedicatedCommonDir, canonicalCommonDir] = await Promise.all([
    gitCommonDir(worktree),
    gitCommonDir(canonicalRoot),
  ]);
  if (!isSamePath(dedicatedCommonDir, canonicalCommonDir)) {
    throw safeError("dedicated_checkout_repository_mismatch");
  }

  const [branch, head, upstreamHead, status] = await Promise.all([
    gitValue(
      worktree,
      ["branch", "--show-current"],
      "dedicated_checkout_branch_unavailable",
    ),
    gitValue(
      worktree,
      ["rev-parse", "HEAD"],
      "dedicated_checkout_head_unavailable",
    ),
    gitValue(
      worktree,
      ["rev-parse", `refs/remotes/origin/${CENTRAL_BRANCH}`],
      "dedicated_checkout_upstream_unavailable",
    ),
    gitValue(
      worktree,
      ["status", "--porcelain=v1", "--untracked-files=all"],
      "dedicated_checkout_status_unavailable",
    ),
  ]);

  if (branch !== "") {
    throw safeError("dedicated_checkout_not_detached");
  }
  if (head !== args.centralBaseSha) {
    throw safeError("dedicated_checkout_head_mismatch");
  }
  if (upstreamHead !== args.centralBaseSha) {
    throw safeError("dedicated_checkout_upstream_mismatch");
  }
  if (status !== "") {
    throw safeError("dedicated_checkout_not_clean");
  }
}

async function validateAcquireEnvironment(args) {
  const worktreeMode = args.worktreeMode || CANONICAL_WORKTREE_MODE;
  if (worktreeMode === DEDICATED_CLEAN_CHECKOUT_MODE) {
    await validateDedicatedCheckout(args);
  }
}

function numberArg(args, key, defaultValue) {
  if (args[key] == null) return defaultValue;
  const parsed = Number(args[key]);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw safeError(`invalid_${key}`);
  }
  return parsed;
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

function sanitizeMetadata(metadata) {
  const output = {};
  let unsafe = false;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {
      metadata_readable: false,
      metadata: null,
      owner_token_hash_present: false,
      metadata_redaction_status: "safe",
    };
  }
  for (const field of SAFE_METADATA_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(metadata, field)) continue;
    const value = metadata[field];
    if (typeof value === "string" && containsUnsafeMetadataValue(value)) {
      output[field] = "[redacted_unsafe_metadata]";
      unsafe = true;
    } else {
      output[field] = value;
    }
  }
  return {
    metadata_readable: true,
    metadata: output,
    owner_token_hash_present: Boolean(metadata.owner_token_hash),
    metadata_redaction_status: unsafe ? "unsafe_metadata_redacted" : "safe",
  };
}

async function readMetadata(lockDir) {
  try {
    const raw = await fs.readFile(path.join(lockDir, "lock.json"), "utf8");
    const metadata = JSON.parse(raw);
    return sanitizeMetadata(metadata);
  } catch {
    return sanitizeMetadata(null);
  }
}

function isStaleFromPayload(payload) {
  const expiresAt = payload.metadata?.expires_at;
  if (!expiresAt || typeof expiresAt !== "string") return false;
  const millis = Date.parse(expiresAt);
  return Number.isFinite(millis) && millis <= Date.now();
}

async function pathExists(target) {
  try {
    await fs.stat(target);
    return true;
  } catch {
    return false;
  }
}

async function statusPayload(lockDir) {
  const locked = await pathExists(lockDir);
  if (!locked) {
    return {
      ok: true,
      locked: false,
      lock_dir: lockDir,
      stale: false,
      metadata_readable: false,
      metadata: null,
      owner_token_hash_present: false,
      metadata_redaction_status: "safe",
      raw_target_url_printed: false,
      owner_token_recorded_in_receipt: false,
    };
  }
  const metadataPayload = await readMetadata(lockDir);
  return {
    ok: true,
    locked: true,
    lock_dir: lockDir,
    stale: isStaleFromPayload(metadataPayload),
    ...metadataPayload,
    raw_target_url_printed: false,
    owner_token_recorded_in_receipt: false,
  };
}

function safeFailure(error, lockDir = null, extra = {}) {
  return {
    ok: false,
    error: error?.safeCode || "central_integration_lock_error",
    ...(lockDir ? { lock_dir: lockDir } : {}),
    ...extra,
    raw_target_url_printed: false,
    owner_token_recorded_in_receipt: false,
  };
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function acquire(args) {
  validateAcquireArgs(args);
  await validateAcquireEnvironment(args);
  const lockDir = validateLockDir(resolveLockDir(args));
  const ttlMs = numberArg(args, "ttlMs", 3_600_000);
  const waitMs = numberArg(args, "waitMs", 0);
  const pollMs = Math.max(1, numberArg(args, "pollMs", 1_000));
  const deadline = Date.now() + waitMs;

  while (true) {
    await fs.mkdir(path.dirname(lockDir), { recursive: true });
    try {
      await fs.mkdir(lockDir);
      const ownerToken = generateToken();
      const acquiredAt = new Date();
      const expiresAt = new Date(acquiredAt.getTime() + ttlMs);
      const metadata = {
        lock_version: "v0",
        owner_id: args.ownerId,
        branch: args.branch,
        worktree: args.worktree,
        worktree_mode: args.worktreeMode || CANONICAL_WORKTREE_MODE,
        ...(args.centralBaseSha
          ? { central_base_sha: args.centralBaseSha }
          : {}),
        integration_packet_id: args.integrationPacketId,
        source_workstream: args.sourceWorkstream,
        source_branch: args.sourceBranch,
        source_commit_sha: args.sourceCommitSha,
        chief_architect_packet_id: args.chiefArchitectPacketId,
        chief_architect_verdict: args.chiefArchitectVerdict,
        critical_section: args.criticalSection,
        acquired_at: acquiredAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        owner_token_hash: hashToken(ownerToken),
        raw_target_url_printed: false,
        owner_token_recorded_in_receipt: false,
      };
      for (const value of Object.values(metadata)) {
        if (typeof value === "string" && containsUnsafeMetadataValue(value)) {
          throw safeError("unsafe_metadata_rejected");
        }
      }
      await fs.writeFile(
        path.join(lockDir, "lock.json"),
        `${JSON.stringify(metadata, null, 2)}\n`,
        { mode: 0o600 },
      );
      return {
        ok: true,
        acquired: true,
        lock_dir: lockDir,
        owner_id: args.ownerId,
        branch: args.branch,
        worktree: args.worktree,
        worktree_mode: args.worktreeMode || CANONICAL_WORKTREE_MODE,
        ...(args.centralBaseSha
          ? { central_base_sha: args.centralBaseSha }
          : {}),
        integration_packet_id: args.integrationPacketId,
        source_workstream: args.sourceWorkstream,
        source_branch: args.sourceBranch,
        source_commit_sha: args.sourceCommitSha,
        chief_architect_packet_id: args.chiefArchitectPacketId,
        chief_architect_verdict: args.chiefArchitectVerdict,
        critical_section: args.criticalSection,
        expires_at: expiresAt.toISOString(),
        owner_token: ownerToken,
        raw_target_url_printed: false,
        owner_token_recorded_in_receipt: false,
      };
    } catch (err) {
      if (err?.code !== "EEXIST") {
        try {
          await fs.rm(lockDir, { recursive: true, force: true });
        } catch {}
        throw err;
      }
      const current = await statusPayload(lockDir);
      if (current.stale || waitMs === 0 || Date.now() >= deadline) {
        return { ...current, ok: false, acquired: false };
      }
      await sleep(Math.min(pollMs, Math.max(1, deadline - Date.now())));
    }
  }
}

async function release(args) {
  const lockDir = validateLockDir(resolveLockDir(args));
  const ownerToken =
    args.ownerToken || process.env.CRM_CORE_CENTRAL_INTEGRATION_LOCK_TOKEN;
  if (!ownerToken) throw safeError("missing_owner_token");
  assertSafeScalar(ownerToken);
  const metadataPath = path.join(lockDir, "lock.json");
  let metadata;
  try {
    metadata = JSON.parse(await fs.readFile(metadataPath, "utf8"));
  } catch {
    return {
      ok: false,
      released: false,
      lock_dir: lockDir,
      error: "lock_metadata_unreadable",
      raw_target_url_printed: false,
      owner_token_recorded_in_receipt: false,
    };
  }
  if (metadata.owner_token_hash !== hashToken(ownerToken)) {
    return {
      ok: false,
      released: false,
      lock_dir: lockDir,
      error: "owner_token_mismatch",
      raw_target_url_printed: false,
      owner_token_recorded_in_receipt: false,
    };
  }
  await fs.rm(lockDir, { recursive: true, force: true });
  return {
    ok: true,
    released: true,
    lock_dir: lockDir,
    raw_target_url_printed: false,
    owner_token_recorded_in_receipt: false,
  };
}

async function main() {
  let command = null;
  let args = {};
  let lockDir = null;
  try {
    ({ command, args } = parseArgs(process.argv.slice(2)));
    if (!command || !["acquire", "release", "status"].includes(command)) {
      throw safeError("unknown_command");
    }
    lockDir = validateLockDir(resolveLockDir(args));
    if (command === "status") {
      jsonOut(await statusPayload(lockDir));
      return;
    }
    if (command === "acquire") {
      const payload = await acquire(args);
      jsonOut(payload, payload.ok ? 0 : 1);
      return;
    }
    if (command === "release") {
      const payload = await release(args);
      jsonOut(payload, payload.ok ? 0 : 1);
    }
  } catch (err) {
    jsonOut(safeFailure(err, lockDir), 1);
  }
}

await main();
