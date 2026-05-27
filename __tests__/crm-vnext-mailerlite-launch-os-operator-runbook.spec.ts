import { describe, expect, test } from "vitest";

import {
  buildApprovalMatrix,
  buildCurrentState,
  buildOperatingPrinciples,
  buildOperatingScenarios,
  buildReportMap,
  buildRunbook,
  commandCatalogFrom,
  parseArgs,
  renderMarkdown,
} from "../scripts/crm-vnext-mailerlite-launch-os-operator-runbook.mjs";

const launch = {
  launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
  resourceName: "Inteligencia para descansar",
  resourceType: "quiz",
};

const cadenceBoard = {
  currentPilot: { launch },
  operatingRhythm: {
    activeCadenceNow: "weekly",
    every3DaysStatus: "designed_but_not_active",
  },
};

const readinessBoard = {
  launch,
  executiveSummary: {
    overallState: "ready_for_department_reviews_not_ready_for_live_operation",
    readyNoLiveLaneCount: 8,
    liveGateOpenCount: 2,
    liveMutationGateOpenCount: 0,
  },
};

const backlogBoard = {
  wipSnapshot: {
    safeToIntakeOneMoreNoLiveIdea: true,
  },
  gateDefaults: [
    { id: "audience_launch", status: "closed_by_default" },
  ],
};

const reconciliationBoard = {
  launch,
  status: "blocked_until_department_reviews_accepted_no_live_changes",
  responseState: {
    pendingDepartments: ["brand", "web_design", "crm"],
  },
};

const packetsIndex = {
  packetCount: 3,
  pendingDepartments: ["brand", "web_design", "crm"],
};

const responseWorkspace = {
  status: "department_review_response_workspace_ready_awaiting_final_responses_no_live_changes",
  readyForIntake: false,
  pendingDepartments: ["brand", "web_design", "crm"],
};

const onboardingHandoffPolicy = {
  status: "mini_launch_onboarding_handoff_policy_ready_no_live_changes",
  targetGroups: {
    eligible: "CC · Journey · Editorial onboarding · Eligible",
  },
};

const onboardingV2Execution = {
  status: "ready_for_human_decision_or_non_live_continuation",
};

const onboardingV2EventContract = {
  status: "onboarding_v2_event_contract_ready_no_ledger_write",
};

const onboardingV1Audit = {
  workflow: {
    id: "154049547088167956",
    name: "Onboarding flow",
    enabled: true,
    complete: true,
    broken: false,
    emailsCount: 11,
  },
  migrationRecommendation: {
    option: "option_b_light_clone_onboarding_v2_then_switch_entry",
  },
};

const brujulaPlan = {
  localEvidence: {
    emailStyle: {
      brujulaCurrentAntiEvidence: true,
    },
    brujulaState: {
      currentWorkflowOffOrIncomplete: true,
    },
  },
};

const brujulaApply = {
  assignedGroups: [
    { name: "CC · Source · Resource · Brújula" },
    { name: "CC · Delivered · Guide · Brújula" },
  ],
};

const packageJson = {
  scripts: {
    "crm:vnext:mailerlite-mini-launch-path-packet": "node scripts/path.mjs",
    "crm:vnext:mailerlite-mini-launch-v0-packet": "node scripts/os.mjs",
    "crm:vnext:mailerlite-mini-launch-rehearsal-packet": "node scripts/rehearsal.mjs",
    "crm:vnext:mailerlite-mini-launch-event-contract": "node scripts/event.mjs",
    "crm:vnext:mailerlite-mini-launch-onboarding-handoff-policy": "node scripts/handoff.mjs",
    "crm:vnext:mailerlite-mini-launch-seed-test-qa-packet": "node scripts/seed.mjs",
    "crm:vnext:mailerlite-mini-launch-group-dry-run": "node scripts/group.mjs",
    "crm:vnext:mailerlite-mini-launch-department-review-packets": "node scripts/packets.mjs",
    "crm:vnext:mailerlite-mini-launch-department-review-intake": "node scripts/intake.mjs",
    "crm:vnext:mailerlite-mini-launch-department-review-reconciliation": "node scripts/reconciliation.mjs",
    "crm:vnext:mailerlite-mini-launch-department-review-delivery-pack": "node scripts/delivery.mjs",
    "crm:vnext:mailerlite-mini-launch-department-review-response-workspace": "node scripts/response-workspace.mjs",
    "crm:vnext:mailerlite-mini-launch-department-review-draft-assist": "node scripts/draft-assist.mjs",
    "crm:vnext:mailerlite-mini-launch-department-review-finalization-preflight": "node scripts/finalization-preflight.mjs",
    "crm:vnext:mailerlite-mini-launch-department-review-finalize-pending": "node scripts/finalize-pending.mjs",
    "crm:vnext:mailerlite-mini-launch-backlog-board": "node scripts/backlog.mjs",
    "crm:vnext:mailerlite-launch-os-operator-runbook": "node scripts/runbook.mjs",
    "crm:vnext:mailerlite-onboarding-v1-audit": "node scripts/v1.mjs",
    "crm:vnext:mailerlite-onboarding-v2-design-packet": "node scripts/v2-design.mjs",
    "crm:vnext:mailerlite-onboarding-v2-empty-groups-packet": "node scripts/v2-groups.mjs",
    "crm:vnext:mailerlite-onboarding-v2-execution-packet": "node scripts/v2-exec.mjs",
    "crm:vnext:mailerlite-onboarding-v2-event-contract": "node scripts/v2-event.mjs",
    "crm:vnext:mailerlite-brujula-test-lane-plan": "node scripts/brujula-plan.mjs",
    "crm:vnext:mailerlite-brujula-test-lane-apply": "node scripts/brujula-apply.mjs",
    "test": "vitest run",
  },
};

const sourceDigests = [
  {
    path: "/tmp/mailerlite-launch-os-v0-control-room.md",
    present: true,
    chars: 1000,
    consultedFor: "current operator state and gate map",
  },
];

describe("CRM vNext MailerLite Launch OS operator runbook", () => {
  test("normalizes default args and outputs", () => {
    const parsed = parseArgs([
      "--out",
      "/tmp/runbook.json",
      "--markdown-out",
      "/tmp/runbook.md",
    ]);

    expect(parsed.controlRoom).toContain("mailerlite-launch-os-v0-control-room.md");
    expect(parsed.readinessBoard).toContain("mailerlite_mini_launch_readiness_board_inteligencia_descansar_2026-05-27.json");
    expect(parsed.cadenceBoard).toContain("mailerlite_mini_launch_cadence_board_2026-05-27.json");
    expect(parsed.backlogBoard).toContain("mailerlite_mini_launch_backlog_board_2026-05-27.json");
    expect(parsed.onboardingHandoffPolicy).toContain("mailerlite_mini_launch_onboarding_handoff_policy_inteligencia_descansar_2026-05-27.json");
    expect(parsed.reconciliationBoard).toContain("mailerlite_mini_launch_department_review_reconciliation_inteligencia_descansar_2026-05-27.json");
    expect(parsed.deliveryPack).toContain("mailerlite_mini_launch_department_review_delivery_pack_inteligencia_descansar_2026-05-27.json");
    expect(parsed.responseWorkspace).toContain("mailerlite_mini_launch_department_review_response_workspace_inteligencia_descansar_2026-05-27.json");
    expect(parsed.onboardingV2EventContract).toContain("mailerlite_onboarding_v2_event_contract_2026-05-27.json");
    expect(parsed.out).toBe("/tmp/runbook.json");
    expect(parsed.markdownOut).toBe("/tmp/runbook.md");
  });

  test("builds command catalog from package scripts", () => {
    const catalog = commandCatalogFrom(packageJson);

    expect(catalog.map((entry) => entry.name)).toContain("crm:vnext:mailerlite-mini-launch-department-review-reconciliation");
    expect(catalog.find((entry) => entry.name === "crm:vnext:mailerlite-brujula-test-lane-apply")).toMatchObject({
      liveRisk: "guarded_live_or_live_adjacent_requires_exact_approval",
    });
    expect(catalog.every((entry) => entry.name.startsWith("crm:vnext:mailerlite"))).toBe(true);
  });

  test("summarizes current state with onboarding protected and live gates closed", () => {
    const state = buildCurrentState({
      readinessBoard,
      cadenceBoard,
      backlogBoard,
      onboardingHandoffPolicy,
      reconciliationBoard,
      packetsIndex,
      onboardingV1Audit,
      onboardingV2Execution,
      onboardingV2EventContract,
      brujulaPlan,
      brujulaApply,
      responseWorkspace,
    });

    expect(state.onboarding.productionV1Protected).toBe(true);
    expect(state.onboarding.productionV1Workflow.name).toBe("Onboarding flow");
    expect(state.onboarding.v2EventContractStatus).toBe("onboarding_v2_event_contract_ready_no_ledger_write");
    expect(state.brujulaPilot.functionalStatus).toBe("test_delivery_verified_creative_qa_pending");
    expect(state.miniLaunch.safeToIntakeOneMoreNoLiveIdea).toBe(true);
    expect(state.miniLaunch.onboardingHandoffPolicyStatus).toBe("mini_launch_onboarding_handoff_policy_ready_no_live_changes");
    expect(state.miniLaunch.onboardingHandoffTargetGroup).toBe("CC · Journey · Editorial onboarding · Eligible");
    expect(state.miniLaunch.pendingDepartments).toEqual(["brand", "web_design", "crm"]);
    expect(state.miniLaunch.responseWorkspaceStatus).toBe("department_review_response_workspace_ready_awaiting_final_responses_no_live_changes");
    expect(state.miniLaunch.readyForResponseIntake).toBe(false);
    expect(state.liveGates).toMatchObject({
      openLiveGateCount: 0,
      liveApprovalNeededNow: false,
    });
  });

  test("approval matrix keeps all live operations behind explicit gates", () => {
    const matrix = buildApprovalMatrix();

    expect(matrix.find((gate) => gate.action === "create_mailerlite_groups")?.status).toBe("closed_until_exact_alejandro_approval");
    expect(matrix.find((gate) => gate.action === "department_review_requests")?.status).toBe("allowed_no_live_review_only");
    expect(matrix.find((gate) => gate.action === "crm_signal_ledger_card_scoring_fact_store")?.status).toBe("closed_until_separate_crm_approval_packet");
  });

  test("codifies the onboarding trunk and mini-launch tributary contract", () => {
    const principles = buildOperatingPrinciples();

    expect(principles.map((principle) => principle.id)).toEqual([
      "protected_editorial_onboarding_trunk",
      "mini_launches_as_marked_entry_points",
      "deliberate_handoff_to_onboarding",
      "separate_delivery_identity_and_voice",
    ]);
    expect(principles.find((principle) => principle.id === "protected_editorial_onboarding_trunk")?.operatorRule).toContain("spaced article sequence");
    expect(principles.find((principle) => principle.id === "deliberate_handoff_to_onboarding")?.operatorRule).toContain("CC · Journey · Editorial onboarding · Eligible");
  });

  test("builds scenarios for current reviews, new ideas and onboarding", () => {
    const catalog = commandCatalogFrom(packageJson);
    const scenarios = buildOperatingScenarios({ commandCatalog: catalog });

    expect(scenarios.map((scenario) => scenario.id)).toEqual([
      "backlog_intake",
      "department_review_delivery",
      "department_response_workspace",
      "current_pilot_department_reviews",
      "after_brand_response",
      "new_mini_launch_idea",
      "onboarding_v2_lane",
      "brujula_test_lane",
    ]);
    expect(scenarios.find((scenario) => scenario.id === "backlog_intake")?.commands.join(" ")).toContain("mini-launch-backlog-board");
    expect(scenarios.find((scenario) => scenario.id === "department_review_delivery")?.commands.join(" ")).toContain("department-review-delivery-pack");
    expect(scenarios.find((scenario) => scenario.id === "department_response_workspace")?.commands.join(" ")).toContain("department-review-response-workspace");
    expect(scenarios.find((scenario) => scenario.id === "department_response_workspace")?.commands.join(" ")).toContain("department-review-draft-assist");
    expect(scenarios.find((scenario) => scenario.id === "department_response_workspace")?.commands.join(" ")).toContain("department-review-finalization-preflight");
    expect(scenarios.find((scenario) => scenario.id === "department_response_workspace")?.commands.join(" ")).toContain("department-review-finalize-pending");
    expect(scenarios.find((scenario) => scenario.id === "current_pilot_department_reviews")?.commands.join(" ")).toContain("department-review-reconciliation");
    expect(scenarios.find((scenario) => scenario.id === "new_mini_launch_idea")?.commands.join(" ")).toContain("onboarding-handoff-policy");
    expect(scenarios.find((scenario) => scenario.id === "onboarding_v2_lane")?.commands.join(" ")).toContain("onboarding-v2-event-contract");
    expect(scenarios.find((scenario) => scenario.id === "onboarding_v2_lane")?.liveGatesRemainClosed).toContain("v1 edit");
  });

  test("builds runbook with command/scenario catalog and no live operations", () => {
    const runbook = buildRunbook({
      readinessBoard,
      cadenceBoard,
      backlogBoard,
      onboardingHandoffPolicy,
      reconciliationBoard,
      packetsIndex,
      responseWorkspace,
      onboardingV1Audit,
      onboardingV2Execution,
      onboardingV2EventContract,
      brujulaPlan,
      brujulaApply,
      packageJson,
      sourceDigests,
      generatedAt: "2026-05-27T00:00:00.000Z",
    });

    expect(runbook.status).toBe("mailerlite_launch_os_operator_runbook_ready_no_live_changes");
    expect(runbook.schemaVersion).toContain("trunk-contract");
    expect(runbook.commandCatalog.length).toBeGreaterThan(10);
    expect(runbook.operatingPrinciples).toHaveLength(4);
    expect(runbook.operatingScenarios).toHaveLength(8);
    expect(runbook.currentState.liveGates.openLiveGateCount).toBe(0);
    expect(runbook.reportMap.controlRoom).toBe("/tmp/mailerlite-launch-os-v0-control-room.md");
    expect(runbook.safety).toMatchObject({
      localOnly: true,
      mailerLiteApiCalled: false,
      mutationsPerformed: false,
      sendsPerformed: false,
      factStoreWritePerformed: false,
    });
  });

  test("builds report map from consulted source paths", () => {
    const reportMap = buildReportMap([
      ...sourceDigests,
      {
        path: "/tmp/mailerlite_mini_launch_backlog_board_2026-05-27.json",
        present: true,
        chars: 2000,
        consultedFor: "mini-launch idea queue and intake capacity",
      },
      {
        path: "/tmp/mailerlite_mini_launch_onboarding_handoff_policy_inteligencia_descansar_2026-05-27.json",
        present: true,
        chars: 2000,
        consultedFor: "mini-launch to onboarding handoff boundary and closed gates",
      },
      {
        path: "/tmp/mailerlite_mini_launch_department_review_delivery_pack_inteligencia_descansar_2026-05-27.json",
        present: true,
        chars: 2000,
        consultedFor: "safe department review delivery blocks and response paths",
      },
      {
        path: "/tmp/mailerlite_mini_launch_department_review_response_workspace_inteligencia_descansar_2026-05-27.json",
        present: true,
        chars: 2000,
        consultedFor: "pending response workspace and final response readiness",
      },
      {
        path: "/tmp/mailerlite_onboarding_v2_event_contract_2026-05-27.json",
        present: true,
        chars: 2000,
        consultedFor: "onboarding v2 CRM event contract and projection boundary",
      },
    ]);

    expect(reportMap.controlRoom).toBe("/tmp/mailerlite-launch-os-v0-control-room.md");
    expect(reportMap.backlogBoard).toBe("/tmp/mailerlite_mini_launch_backlog_board_2026-05-27.json");
    expect(reportMap.onboardingHandoffPolicy).toBe("/tmp/mailerlite_mini_launch_onboarding_handoff_policy_inteligencia_descansar_2026-05-27.json");
    expect(reportMap.departmentReviewDeliveryPack).toBe("/tmp/mailerlite_mini_launch_department_review_delivery_pack_inteligencia_descansar_2026-05-27.json");
    expect(reportMap.departmentReviewResponseWorkspace).toBe("/tmp/mailerlite_mini_launch_department_review_response_workspace_inteligencia_descansar_2026-05-27.json");
    expect(reportMap.onboardingV2EventContract).toBe("/tmp/mailerlite_onboarding_v2_event_contract_2026-05-27.json");
  });

  test("renders operator runbook with next moves and approval matrix", () => {
    const runbook = buildRunbook({
      readinessBoard,
      cadenceBoard,
      backlogBoard,
      onboardingHandoffPolicy,
      reconciliationBoard,
      packetsIndex,
      responseWorkspace,
      onboardingV1Audit,
      onboardingV2Execution,
      onboardingV2EventContract,
      brujulaPlan,
      brujulaApply,
      packageJson,
      sourceDigests,
      generatedAt: "2026-05-27T00:00:00.000Z",
    });
    const markdown = renderMarkdown(runbook);

    expect(markdown).toContain("Operator Runbook");
    expect(markdown).toContain("Operating Principles");
    expect(markdown).toContain("protected_editorial_onboarding_trunk");
    expect(markdown).toContain("market-learning tributaries");
    expect(markdown).toContain("current_pilot_department_reviews");
    expect(markdown).toContain("backlog_intake");
    expect(markdown).toContain("department_review_delivery");
    expect(markdown).toContain("department_response_workspace");
    expect(markdown).toContain("draft-assist");
    expect(markdown).toContain("finalization-preflight");
    expect(markdown).toContain("finalize-pending");
    expect(markdown).toContain("Ready for response intake: false");
    expect(markdown).toContain("Onboarding v2 event contract");
    expect(markdown).toContain("Onboarding handoff policy");
    expect(markdown).toContain("CC · Journey · Editorial onboarding · Eligible");
    expect(markdown).toContain("Approval Matrix");
    expect(markdown).toContain("Report Map");
    expect(markdown).toContain("Open live gates: 0");
    expect(markdown).toContain("Sin MailerLite API calls");
  });
});
