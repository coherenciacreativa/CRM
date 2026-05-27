import { describe, expect, test } from "vitest";

import {
  buildGoalAudit,
  buildRequirementChecks,
  parseArgs,
  renderMarkdown,
  summarizeCompletion,
} from "../scripts/crm-vnext-mailerlite-launch-os-goal-audit.mjs";

const runbook = {
  status: "mailerlite_launch_os_operator_runbook_ready_no_live_changes",
  commandCatalog: [
    { name: "crm:vnext:mailerlite-launch-os-operator-runbook" },
    { name: "crm:vnext:mailerlite-onboarding-v2-event-contract" },
  ],
  operatingScenarios: [{ id: "current_pilot_department_reviews" }],
  approvalMatrix: [{ action: "create_mailerlite_groups" }],
  currentState: {
    liveGates: { openLiveGateCount: 0 },
    miniLaunch: {
      cadenceNow: "weekly",
      safeToIntakeOneMoreNoLiveIdea: true,
      packetCount: 3,
      responseWorkspaceStatus: "department_review_response_workspace_ready_awaiting_final_responses_no_live_changes",
      readyForResponseIntake: false,
    },
  },
  safety: {
    mailerLiteApiCalled: false,
    mutationsPerformed: false,
    sendsPerformed: false,
  },
};

const readinessBoard = {
  executiveSummary: {
    overallState: "ready_for_department_reviews_not_ready_for_live_operation",
    readyNoLiveLaneCount: 8,
    liveMutationGateOpenCount: 0,
  },
  lanes: [
    {
      id: "mailerlite_group_dry_run",
      sourceStatus: "blocked_until_brand_dictionary_candidates",
    },
  ],
};

const reconciliationBoard = {
  status: "blocked_until_department_reviews_accepted_no_live_changes",
  responseState: {
    pendingDepartments: ["brand", "web_design", "crm"],
  },
  liveGateSummary: {
    openLiveGateCount: 0,
  },
};

const responseWorkspace = {
  status: "department_review_response_workspace_ready_awaiting_final_responses_no_live_changes",
  readyForIntake: false,
  pendingDepartments: ["brand", "web_design", "crm"],
};

const onboardingV1Audit = {
  workflow: {
    name: "Onboarding flow",
    enabled: true,
    complete: true,
    broken: false,
  },
  migrationRecommendation: {
    option: "option_b_light_clone_onboarding_v2_then_switch_entry",
  },
};

const onboardingV2Design = {
  status: "ready_for_human_architecture_review",
};

const onboardingV2Execution = {
  status: "ready_for_human_decision_or_non_live_continuation",
};

const onboardingV2EventContract = {
  status: "onboarding_v2_event_contract_ready_no_ledger_write",
  normalizationProof: {
    eventsGenerated: 12,
  },
};

const onboardingHandoffPolicy = {
  status: "mini_launch_onboarding_handoff_policy_ready_no_live_changes",
  targetGroups: {
    eligible: "CC · Journey · Editorial onboarding · Eligible",
  },
  v1Protection: {
    productionV1Protected: true,
  },
  contractCoverage: {
    handoffEventProjectionPosture: "store_only; recommendation is not routing and not contact permission",
  },
  handoffLadder: [
    {
      action: "recommend_onboarding_handoff",
      currentAllowedState: "store_only_event_contract",
    },
  ],
  approvalBoundary: {
    closedNow: [
      "Assign any subscriber to onboarding eligibility.",
      "Attach mini-launch participants to active onboarding v1.",
    ],
  },
  operatorRule: "Recommendation is not routing. Routing requires a later exact approval and a fresh protected workflow/subscriber scan.",
  safety: {
    mailerLiteApiCalled: false,
    subscriberMutationsPerformed: false,
    workflowMutationsPerformed: false,
    signalLedgerAppendPerformed: false,
    crmCardMutationsPerformed: false,
    sendsPerformed: false,
  },
};

const brujulaPlan = {
  localEvidence: {
    brujulaState: {
      currentWorkflowOffOrIncomplete: true,
    },
    emailStyle: {
      brujulaCurrentAntiEvidence: true,
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
    "crm:vnext:mailerlite-launch-os-operator-runbook": "node scripts/runbook.mjs",
    "crm:vnext:mailerlite-onboarding-v2-event-contract": "node scripts/event.mjs",
    "crm:vnext:mailerlite-mini-launch-cadence-board": "node scripts/cadence.mjs",
  },
};

const values = {
  runbook,
  readinessBoard,
  reconciliationBoard,
  responseWorkspace,
  onboardingV1Audit,
  onboardingV2Design,
  onboardingV2Execution,
  onboardingV2EventContract,
  onboardingHandoffPolicy,
  brujulaPlan,
  brujulaApply,
  brandTaxonomy: "CC · Source\nCC · Delivered\nCC · Sent\n",
  brandDictionary: "CC · Source · Resource · Brújula\n",
  packageJson,
};

const sourceDigests = [
  {
    path: "/tmp/mailerlite_launch_os_operator_runbook_2026-05-27.json",
    present: true,
    chars: 1000,
    consultedFor: "operator runbook state",
  },
];

describe("CRM vNext MailerLite Launch OS goal audit", () => {
  test("normalizes default args and output paths", () => {
    const parsed = parseArgs([
      "--out",
      "/tmp/audit.json",
      "--markdown-out",
      "/tmp/audit.md",
    ]);

    expect(parsed.runbook).toContain("mailerlite_launch_os_operator_runbook_2026-05-27.json");
    expect(parsed.controlRoom).toContain("mailerlite-launch-os-v0-control-room.md");
    expect(parsed.brandDictionary).toContain("MAILERLITE_GROUP_DICTIONARY_V0.md");
    expect(parsed.onboardingHandoffPolicy).toContain("mailerlite_mini_launch_onboarding_handoff_policy_inteligencia_descansar_2026-05-27.json");
    expect(parsed.out).toBe("/tmp/audit.json");
    expect(parsed.markdownOut).toBe("/tmp/audit.md");
  });

  test("builds requirement checks from current evidence", () => {
    const checks = buildRequirementChecks(values);
    const byId = Object.fromEntries(checks.map((check) => [check.id, check]));

    expect(byId.protect_productive_onboarding_v1.status).toBe("proven");
    expect(byId.design_onboarding_v2.status).toBe("proven");
    expect(byId.coordinate_brand_web_crm.status).toBe("blocked_waiting_department_reviews");
    expect(byId.coordinate_brand_web_crm.evidence).toContain("readyForResponseIntake=false");
    expect(byId.coordinate_brand_web_crm.evidence).toContain("workspacePendingDepartments=brand,web_design,crm");
    expect(byId.define_mini_launch_to_onboarding_handoff.status).toBe("proven");
    expect(byId.define_mini_launch_to_onboarding_handoff.evidence).toContain("handoffTargetGroup=CC · Journey · Editorial onboarding · Eligible");
    expect(byId.define_mini_launch_to_onboarding_handoff.evidence).toContain("recommendationIsNotRouting=true");
    expect(byId.enforce_live_change_approval_boundary.status).toBe("proven");
    expect(byId.brujula_test_pilot_status.status).toBe("partial_functional_green_creative_yellow");
  });

  test("summarizes incomplete goal without opening live gates", () => {
    const checks = buildRequirementChecks(values);
    const summary = summarizeCompletion(checks);

    expect(summary.readyForLiveOperation).toBe(false);
    expect(summary.overallStatus).toBe("goal_active_not_ready_for_live_operation");
    expect(summary.blockedCount).toBe(1);
    expect(summary.provenCount).toBeGreaterThan(2);
  });

  test("builds an audit with explicit next moves and safety flags", () => {
    const audit = buildGoalAudit({
      values,
      sourceDigests,
      generatedAt: "2026-05-27T00:00:00.000Z",
    });

    expect(audit.status).toBe("goal_active_not_ready_for_live_operation");
    expect(audit.executiveSummary.liveActionAllowedNow).toBe(false);
    expect(audit.executiveSummary.nextBestMove).toContain("response workspace");
    expect(audit.nextMoves.join(" ")).toContain("rerun the launch group dry-run");
    expect(audit.nextMoves.join(" ")).toContain("final response files only");
    expect(audit.safety).toMatchObject({
      localOnly: true,
      mailerLiteApiCalled: false,
      groupMutationsPerformed: false,
      sendsPerformed: false,
    });
  });

  test("renders operator-readable markdown", () => {
    const audit = buildGoalAudit({
      values,
      sourceDigests,
      generatedAt: "2026-05-27T00:00:00.000Z",
    });
    const markdown = renderMarkdown(audit);

    expect(markdown).toContain("# MailerLite Launch OS v0 - Goal Audit");
    expect(markdown).toContain("Status: goal_active_not_ready_for_live_operation");
    expect(markdown).toContain("### define_mini_launch_to_onboarding_handoff");
    expect(markdown).toContain("### coordinate_brand_web_crm");
    expect(markdown).toContain("No MailerLite, Shopify or CRM live API calls");
  });
});
