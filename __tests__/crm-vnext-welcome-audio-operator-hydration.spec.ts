import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";
import { evaluateWelcomeAudioRoutePreflight } from "../scripts/crm-vnext-welcome-audio-route-preflight.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const profilePath = resolve(
  repoRoot,
  "docs/crm-vnext/crm-core-codex-profile.md",
);
const adapterPath = resolve(
  repoRoot,
  "docs/crm-vnext/instagram-welcome-audio-safari-action-adapter-v1.md",
);
const canaryResultPath = resolve(
  repoRoot,
  "docs/crm-vnext/instagram-welcome-audio-one-recipient-canary-result-2026-07-24.md",
);

const authoritativeReadOrder = [
  "docs/crm-vnext/missions/crm-core-native-notification-profile-binding-no-live-v1.md",
  "docs/crm-vnext/instagram-welcome-audio-safari-action-adapter-v1.md",
  "docs/crm-vnext/instagram-welcome-audio-ui-attested-single-recipient-live-admission-v1.md",
  "docs/crm-vnext/missions/crm-core-iab-semantic-source-to-safari-handoff-proof-v1.md",
  "docs/crm-vnext/instagram-computer-use-quality-gate-v0.md",
  "docs/crm-vnext/instagram-welcome-audio-first-controlled-send-result-v0.md",
  "docs/crm-vnext/instagram-welcome-audio-one-recipient-canary-result-2026-07-24.md",
];

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, " ");

describe("CRM Core welcome-audio cold-start hydration", () => {
  test("requires the executable source/actuator route gate before browser selection", async () => {
    const profile = await readFile(profilePath, "utf8");

    expect(profile).toContain(
      "node scripts/crm-vnext-welcome-audio-route-preflight.mjs",
    );
    expect(profile).toContain(
      "source_surface=iab_semantic_notifications",
    );
    expect(profile).toContain(
      "actuator_surface=safari_standard_isolated_native_picker",
    );
    expect(profile).toContain("safari_as_source=false");
    expect(profile).toContain("route_preflight_status=green");
    expect(profile).toContain("head_matches_upstream=true");
    expect(profile).toContain("worktree_clean=true");
    expect(profile).toContain("before browser selection");
  });

  test("fails closed when Git or the central route contracts drift", () => {
    const greenInput = {
      head: "same",
      upstreamHead: "same",
      worktreeStatus: "",
      profile: [
        "## Welcome-Audio Operator Hydration",
        "docs/crm-vnext/missions/crm-core-iab-semantic-source-to-safari-handoff-proof-v1.md",
        "docs/crm-vnext/instagram-welcome-audio-safari-action-adapter-v1.md",
        "must stop before source use",
      ].join("\n"),
      handoff: [
        "The In-App Browser is a read-only source in this mission.",
        "Safari remains the only possible actuator.",
      ].join("\n"),
      adapter: [
        "standard isolated Safari window",
        "native file picker",
      ].join("\n"),
    };

    expect(evaluateWelcomeAudioRoutePreflight(greenInput)).toMatchObject({
      source_surface: "iab_semantic_notifications",
      actuator_surface: "safari_standard_isolated_native_picker",
      safari_as_source: false,
      route_preflight_status: "green",
      head_matches_upstream: true,
      worktree_clean: true,
      central_contracts_green: true,
      source_actions: 0,
      browser_actions: 0,
      real_effects: 0,
    });

    expect(
      evaluateWelcomeAudioRoutePreflight({
        ...greenInput,
        upstreamHead: "different",
      }),
    ).toMatchObject({
      route_preflight_status: "blocked",
      head_matches_upstream: false,
    });

    expect(
      evaluateWelcomeAudioRoutePreflight({
        ...greenInput,
        worktreeStatus: " M tracked-file",
      }),
    ).toMatchObject({
      route_preflight_status: "blocked",
      worktree_clean: false,
    });

    expect(
      evaluateWelcomeAudioRoutePreflight({
        ...greenInput,
        handoff: "route contract missing",
      }),
    ).toMatchObject({
      route_preflight_status: "blocked",
      central_contracts_green: false,
    });
  });

  test("routes a lower-effort agent through the central contracts in order", async () => {
    const profile = await readFile(profilePath, "utf8");

    let previousIndex = profile.indexOf("## Welcome-Audio Operator Hydration");
    expect(previousIndex).toBeGreaterThan(-1);

    for (const source of authoritativeReadOrder) {
      const sourceIndex = profile.indexOf(`\`${source}\``, previousIndex);
      expect(sourceIndex).toBeGreaterThan(previousIndex);
      previousIndex = sourceIndex;
    }

    expect(profile).toContain("native Notifications");
    expect(profile).toContain("exact notification-to-profile binding");
    expect(profile).toContain(
      "exact Message action or the bounded Options -> Send message fallback",
    );
    expect(profile).toContain("durable claim and pending state");
    expect(profile).toContain("native-picker upload");
    expect(profile).toContain(
      "exact approved-asset preview in the bound thread",
    );
    expect(profile).toContain("same-thread confirmation or terminal unknown/no-retry");
    expect(profile).toContain("must stop before source use");
  });

  test("keeps the historical unmerged protocol non-authoritative", async () => {
    const profile = await readFile(profilePath, "utf8");

    expect(profile).toContain(
      "historical unmerged Safari upload-hardening lane",
    );
    expect(profile).toContain("Do not cherry-pick");
    expect(profile).toContain("non-authoritative");
    expect(profile).not.toContain(
      "`docs/crm-vnext/instagram-welcome-audio-safari-upload-route-hardening-protocol-v0.md`",
    );
  });

  test("documents the bounded UI fallback and one-restart recovery without widening authority", async () => {
    const adapter = await readFile(adapterPath, "utf8");
    const normalizedAdapter = normalizeWhitespace(adapter);

    const profileIndex = adapter.indexOf(
      "already-bound exact profile with current follows-owner evidence",
    );
    const fallbackIndex = adapter.indexOf(
      "if and only if Message is absent, use Options -> Send message once",
      profileIndex,
    );
    const threadIndex = adapter.indexOf(
      "confirm the exact owner/profile/thread binding",
      fallbackIndex,
    );

    expect(profileIndex).toBeGreaterThan(-1);
    expect(fallbackIndex).toBeGreaterThan(profileIndex);
    expect(threadIndex).toBeGreaterThan(fallbackIndex);
    expect(normalizedAdapter).toContain("use one normal Safari quit/reopen only");
    expect(normalizedAdapter).toContain(
      "reacquire the dedicated standard non-private isolated window from scratch",
    );
    expect(normalizedAdapter).toContain(
      "does not authorize a retry after upload",
    );
  });

  test("records a fail-closed aggregate output contract without claiming runtime enforcement", async () => {
    const adapter = await readFile(adapterPath, "utf8");
    const normalizedAdapter = normalizeWhitespace(adapter);

    expect(adapter).toContain("aggregate_allowlist_only");
    expect(adapter).toContain("privacy_output_gate: green|blocked_fail_closed");
    expect(adapter).toContain("This section is a documentation contract");
    expect(adapter).toContain("`privacy_output_runtime_proven` remains `false`");
    expect(adapter).toContain("callback state/query/fragment canaries");
    expect(normalizedAdapter).toContain(
      "If a tool cannot suppress a private observation from its returned output",
    );
    expect(normalizedAdapter).toContain(
      "mark `privacy_output_gate: blocked_fail_closed`",
    );
    expect(normalizedAdapter).toContain(
      "another live canary remains blocked even when this static contract test is green",
    );
  });

  test("keeps the confirmed canary in a separate aggregate result with no new authority", async () => {
    const adapter = await readFile(adapterPath, "utf8");
    const result = await readFile(canaryResultPath, "utf8");

    expect(adapter).not.toContain("## 2026-07-24 One-Recipient Canary Delta");
    expect(result).toContain("records_inspected: 8");
    expect(result).toContain("send_attempt_count: 1");
    expect(result).toContain("privacy_output_runtime_proven: false");
    expect(result).toContain("another_live_canary_allowed: false");
    expect(result).toContain("grants no source read");
  });
});
