import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

const repoRoot = resolve(import.meta.dirname, "..");

const allowedPaths = [
  ".agents/skills/crm-core-mission-operator/SKILL.md",
  ".agents/skills/crm-core-mission-operator/references/mission-contract-template.md",
  "AGENTS.md",
  "__tests__/crm-vnext-crm-core-problem-reality-gate.spec.ts",
  "docs/crm-vnext/crm-core-codex-profile.md",
  "docs/crm-vnext/crm-core-consultant-ui-relay-autonomous-sprint-protocol-v0.md",
  "docs/crm-vnext/crm-core-mission-contract-template-v1.md",
  "docs/crm-vnext/crm-core-problem-reality-gate-v1.md",
  "docs/crm-vnext/missions/crm-core-problem-reality-gate-repo-only-v1.md",
].sort();

const governancePaths = allowedPaths.filter((path) => path.endsWith(".md"));

const evidenceLevels = [
  "codex_claimed",
  "repo_verified",
  "reproduced_no_effect",
  "runtime_empirical",
  "product_observed",
];

const diagnosisVerdicts = [
  "verified_problem",
  "existing_solution_or_route",
  "insufficient_evidence",
];

const problemGateFields = [
  "applicability",
  "claimed_blocker",
  "evidence_level",
  "canonical_state_verified",
  "expected_behavior",
  "observed_behavior",
  "first_divergence",
  "existing_solution_search",
  "existing_component_loaded_and_invoked",
  "alternative_explanations_tested",
  "minimal_reproduction",
  "causal_link_to_proposed_fix",
  "no_build_option",
  "new_engineering_indispensable",
  "remaining_uncertainty",
  "diagnosis_verdict",
];

const canonicalRootOrder = [
  "mission_id",
  "business_outcome",
  "observable_success",
  "mode",
  "approval_gate",
  "approved_effects",
  "forbidden_scope",
  "source_private_boundaries",
  "autonomy_budget",
  "self_repair_budget",
  "manual_intervention_policy",
  "leverage_filter",
  "atomicity_freshness_requirements",
  "reviewer_plan",
  "escalation_conditions",
  "central_integration_plan",
  "final_ceo_brief_fields",
];

type GateInput = {
  evidenceLevel: (typeof evidenceLevels)[number];
  repoContradiction?: boolean;
  runtimeClaim?: boolean;
  runtimeReproduced?: boolean;
  existingComponentFound?: boolean;
  existingComponentLoadedAndInvoked?: boolean;
  proposesNewRuntimeOrBackend?: boolean;
  noBuildRejected?: boolean;
  causalProof?: boolean;
  indispensable?: boolean;
  productReadinessClaim?: boolean;
};

const evaluateGate = (input: GateInput) => {
  if (
    input.existingComponentFound === true &&
    input.existingComponentLoadedAndInvoked !== true
  ) {
    return {
      diagnosis: "existing_solution_or_route",
      action: "no_build",
    };
  }

  if (input.evidenceLevel === "codex_claimed") {
    return { diagnosis: "insufficient_evidence", action: "hold" };
  }

  if (input.productReadinessClaim === true) {
    return input.evidenceLevel === "product_observed"
      ? { diagnosis: "verified_problem", action: "readiness_claim_within_observed_scope" }
      : { diagnosis: "insufficient_evidence", action: "hold" };
  }

  if (
    input.runtimeClaim === true &&
    input.runtimeReproduced !== true &&
    !["reproduced_no_effect", "runtime_empirical"].includes(input.evidenceLevel)
  ) {
    return { diagnosis: "insufficient_evidence", action: "hold" };
  }

  if (input.proposesNewRuntimeOrBackend === true) {
    const green =
      input.evidenceLevel === "runtime_empirical" &&
      input.noBuildRejected === true &&
      input.causalProof === true &&
      input.indispensable === true;
    return green
      ? { diagnosis: "verified_problem", action: "chief_architect_ruling_required" }
      : { diagnosis: "insufficient_evidence", action: "hold" };
  }

  if (input.repoContradiction === true && input.evidenceLevel === "repo_verified") {
    return {
      diagnosis: "verified_problem",
      action: "bounded_repo_contradiction_repair_only",
    };
  }

  return { diagnosis: "insufficient_evidence", action: "hold" };
};

const read = (path: string) => readFile(resolve(repoRoot, path), "utf8");
const normalizeWhitespace = (value: string) => value.replace(/\s+/g, " ");

const rootKeys = (markdown: string) => {
  const yaml = markdown.match(/```yaml\n([\s\S]*?)\n```/)?.[1] ?? "";
  return yaml
    .split("\n")
    .filter((line) => /^[a-z][a-z0-9_]*:/.test(line))
    .map((line) => line.slice(0, line.indexOf(":")));
};

describe("CRM Core Problem Reality Gate", () => {
  test("declares exactly the approved nine paths without freezing future repository diffs", async () => {
    const mission = await read(
      "docs/crm-vnext/missions/crm-core-problem-reality-gate-repo-only-v1.md",
    );
    const declaredBlock = mission.match(
      /  exact_changed_file_allowlist:\n([\s\S]*?)\n  deterministic_checks:/,
    )?.[1];
    const declaredPaths = (declaredBlock ?? "")
      .split("\n")
      .map((line) => line.match(/^    - (.+)$/)?.[1])
      .filter((path): path is string => Boolean(path))
      .sort();

    expect(declaredPaths).toEqual(allowedPaths);
    expect(allowedPaths.some((path) => path.endsWith(".toml"))).toBe(false);
  });

  test("preserves Mission Contract root fields and order byte-for-byte", async () => {
    const [compactTemplate, canonicalTemplate] = await Promise.all([
      read(".agents/skills/crm-core-mission-operator/references/mission-contract-template.md"),
      read("docs/crm-vnext/crm-core-mission-contract-template-v1.md"),
    ]);

    expect(rootKeys(compactTemplate)).toEqual(canonicalRootOrder);
    expect(rootKeys(canonicalTemplate)).toEqual(canonicalRootOrder);

    for (const template of [compactTemplate, canonicalTemplate]) {
      const approvalStart = template.indexOf("approval_gate:");
      const approvedEffectsStart = template.indexOf("approved_effects:");
      const approvalBlock = template.slice(approvalStart, approvedEffectsStart);
      expect(approvalBlock).toContain("  problem_reality_gate:");
      expect(approvalBlock).not.toContain("\nproblem_reality_gate:");
      for (const field of problemGateFields) {
        expect(approvalBlock).toContain(`    ${field}:`);
      }
    }
  });

  test("keeps Markdown and YAML fences hygienic", async () => {
    for (const path of governancePaths) {
      const content = await read(path);
      expect((content.match(/```/g) ?? []).length % 2).toBe(0);
      expect(content).not.toMatch(/[ \t]+$/m);
      expect(content).not.toContain("\t");
    }
  });

  test("shares evidence levels and verdicts across canonical entrypoints", async () => {
    const requiredEntryPoints = [
      "AGENTS.md",
      ".agents/skills/crm-core-mission-operator/SKILL.md",
      ".agents/skills/crm-core-mission-operator/references/mission-contract-template.md",
      "docs/crm-vnext/crm-core-mission-contract-template-v1.md",
      "docs/crm-vnext/crm-core-consultant-ui-relay-autonomous-sprint-protocol-v0.md",
      "docs/crm-vnext/crm-core-codex-profile.md",
      "docs/crm-vnext/crm-core-problem-reality-gate-v1.md",
    ];

    for (const path of requiredEntryPoints) {
      const content = await read(path);
      for (const level of evidenceLevels) expect(content).toContain(level);
      for (const verdict of diagnosisVerdicts) expect(content).toContain(verdict);
    }
  });

  test("enforces thresholds, reviewer order, and privacy boundaries", async () => {
    const [policy, relay, profile] = await Promise.all([
      read("docs/crm-vnext/crm-core-problem-reality-gate-v1.md"),
      read("docs/crm-vnext/crm-core-consultant-ui-relay-autonomous-sprint-protocol-v0.md"),
      read("docs/crm-vnext/crm-core-codex-profile.md"),
    ]);
    const normalizedPolicy = normalizeWhitespace(policy);
    const normalizedRelay = normalizeWhitespace(relay);
    const normalizedProfile = normalizeWhitespace(profile);

    expect(policy).toContain("Failure to find a component is not proof of nonexistence");
    expect(policy).toContain("A technically correct fix for an unverified problem remains HOLD");
    expect(normalizedPolicy).toContain(
      "path labels, aggregate states, and redacted reproduction results",
    );
    expect(policy).toContain("giant logs");
    expect(relay).toContain("complete `problem_reality_gate` block");
    expect(normalizedRelay).toContain(
      "without the complete block is non-actionable",
    );
    expect(relay).toContain("independent diagnosis review");
    expect(normalizedRelay).toContain(
      "only when the diagnosis is `verified_problem`, artifact review",
    );
    expect(profile).toContain("stop before tracked writes");
    expect(normalizedProfile).toContain("repair hydration or the entrypoint");
  });

  test("returns no-build when a missing component already has an uninvoked entrypoint", () => {
    expect(
      evaluateGate({
        evidenceLevel: "repo_verified",
        existingComponentFound: true,
        existingComponentLoadedAndInvoked: false,
      }),
    ).toEqual({
      diagnosis: "existing_solution_or_route",
      action: "no_build",
    });
  });

  test("permits only a bounded repair for an exact current-SHA repo contradiction", () => {
    expect(
      evaluateGate({
        evidenceLevel: "repo_verified",
        repoContradiction: true,
      }),
    ).toEqual({
      diagnosis: "verified_problem",
      action: "bounded_repo_contradiction_repair_only",
    });
  });

  test("holds a narrated runtime blocker without reproduction", () => {
    expect(
      evaluateGate({
        evidenceLevel: "codex_claimed",
        runtimeClaim: true,
        runtimeReproduced: false,
      }),
    ).toEqual({
      diagnosis: "insufficient_evidence",
      action: "hold",
    });
  });

  test("requires empirical causality and indispensability for a new runtime or backend", () => {
    expect(
      evaluateGate({
        evidenceLevel: "runtime_empirical",
        proposesNewRuntimeOrBackend: true,
        noBuildRejected: false,
        causalProof: true,
        indispensable: true,
      }).diagnosis,
    ).toBe("insufficient_evidence");

    expect(
      evaluateGate({
        evidenceLevel: "runtime_empirical",
        proposesNewRuntimeOrBackend: true,
        noBuildRejected: true,
        causalProof: true,
        indispensable: true,
      }),
    ).toEqual({
      diagnosis: "verified_problem",
      action: "chief_architect_ruling_required",
    });
  });

  test("requires product_observed for a product-readiness claim", () => {
    expect(
      evaluateGate({
        evidenceLevel: "runtime_empirical",
        productReadinessClaim: true,
      }),
    ).toEqual({
      diagnosis: "insufficient_evidence",
      action: "hold",
    });

    expect(
      evaluateGate({
        evidenceLevel: "product_observed",
        productReadinessClaim: true,
      }),
    ).toEqual({
      diagnosis: "verified_problem",
      action: "readiness_claim_within_observed_scope",
    });
  });

  test("introduces no source, live, or model-routing authority", async () => {
    const [policy, mission] = await Promise.all([
      read("docs/crm-vnext/crm-core-problem-reality-gate-v1.md"),
      read("docs/crm-vnext/missions/crm-core-problem-reality-gate-repo-only-v1.md"),
    ]);
    const normalizedPolicy = normalizeWhitespace(policy);

    expect(normalizedPolicy).toContain(
      "no source, private-read, browser, model-routing, backend, runtime, capability, integration, or live authority",
    );
    expect(mission).toContain("live_source_reads: []");
    expect(mission).toContain("private_artifact_reads: []");
    expect(mission).toContain("UI_actions: []");
    expect(mission).toContain("product outcome unchanged");
    expect(mission).not.toContain("send_ready: true");
  });
});
