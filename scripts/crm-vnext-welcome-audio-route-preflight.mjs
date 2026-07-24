#!/usr/bin/env node

import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const SOURCE_SURFACE = "iab_semantic_notifications";
const ACTUATOR_SURFACE = "safari_standard_isolated_native_picker";
const PROFILE_PATH = "docs/crm-vnext/crm-core-codex-profile.md";
const HANDOFF_PATH =
  "docs/crm-vnext/missions/crm-core-iab-semantic-source-to-safari-handoff-proof-v1.md";
const ADAPTER_PATH =
  "docs/crm-vnext/instagram-welcome-audio-safari-action-adapter-v1.md";

const requiredProfileFragments = [
  "## Welcome-Audio Operator Hydration",
  HANDOFF_PATH,
  ADAPTER_PATH,
  "must stop before source use",
];

const requiredHandoffFragments = [
  "The In-App Browser is a read-only source in this mission.",
  "Safari remains the only possible actuator.",
];

const requiredAdapterFragments = [
  "standard isolated Safari window",
  "native file picker",
];

const normalizeWhitespace = (value) => value.replace(/\s+/g, " ").trim();

const includesEvery = (text, fragments) => {
  const normalizedText = normalizeWhitespace(text);
  return fragments.every((fragment) =>
    normalizedText.includes(normalizeWhitespace(fragment)),
  );
};

const runGit = async (repoRoot, args) => {
  const { stdout } = await execFileAsync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
  });
  return stdout.trim();
};

export const evaluateWelcomeAudioRoutePreflight = ({
  head,
  upstreamHead,
  worktreeStatus,
  profile,
  handoff,
  adapter,
}) => {
  const headMatchesUpstream = Boolean(head) && head === upstreamHead;
  const worktreeClean = worktreeStatus.trim() === "";
  const contractsGreen =
    includesEvery(profile, requiredProfileFragments) &&
    includesEvery(handoff, requiredHandoffFragments) &&
    includesEvery(adapter, requiredAdapterFragments);

  const green = headMatchesUpstream && worktreeClean && contractsGreen;

  return {
    source_surface: SOURCE_SURFACE,
    actuator_surface: ACTUATOR_SURFACE,
    safari_as_source: false,
    route_preflight_status: green ? "green" : "blocked",
    head_matches_upstream: headMatchesUpstream,
    worktree_clean: worktreeClean,
    central_contracts_green: contractsGreen,
    source_actions: 0,
    browser_actions: 0,
    real_effects: 0,
  };
};

export const runWelcomeAudioRoutePreflight = async ({ repoRoot }) => {
  const [head, upstreamHead, worktreeStatus, profile, handoff, adapter] =
    await Promise.all([
      runGit(repoRoot, ["rev-parse", "HEAD"]),
      runGit(repoRoot, ["rev-parse", "@{upstream}"]),
      runGit(repoRoot, ["status", "--porcelain"]),
      readFile(resolve(repoRoot, PROFILE_PATH), "utf8"),
      readFile(resolve(repoRoot, HANDOFF_PATH), "utf8"),
      readFile(resolve(repoRoot, ADAPTER_PATH), "utf8"),
    ]);

  return evaluateWelcomeAudioRoutePreflight({
    head,
    upstreamHead,
    worktreeStatus,
    profile,
    handoff,
    adapter,
  });
};

const main = async () => {
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const repoRoot = resolve(scriptDir, "..");
  const result = await runWelcomeAudioRoutePreflight({ repoRoot });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.route_preflight_status !== "green") process.exitCode = 1;
};

const isDirectRun =
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (isDirectRun) {
  main().catch((error) => {
    process.stdout.write(
      `${JSON.stringify(
        {
          source_surface: SOURCE_SURFACE,
          actuator_surface: ACTUATOR_SURFACE,
          safari_as_source: false,
          route_preflight_status: "blocked",
          error_code: "route_preflight_execution_failed",
          source_actions: 0,
          browser_actions: 0,
          real_effects: 0,
        },
        null,
        2,
      )}\n`,
    );
    process.exitCode = 1;
  });
}
