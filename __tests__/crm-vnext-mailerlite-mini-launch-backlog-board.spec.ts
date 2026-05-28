import { describe, expect, test } from "vitest";

import {
  buildBacklogBoard,
  buildCurrentPilotRow,
  buildGateDefaults,
  buildIdeaTemplate,
  buildIntakePolicy,
  buildSafety,
  buildWipSnapshot,
  parseArgs,
  renderMarkdown,
} from "../scripts/crm-vnext-mailerlite-mini-launch-backlog-board.mjs";

const cadenceBoard = {
  ok: true,
  status: "mini_launch_cadence_board_ready_no_live_changes",
  operatingRhythm: {
    activeCadenceNow: "weekly",
    every3DaysStatus: "designed_but_not_active",
  },
  backlogFields: [
    "idea_id",
    "theme",
    "resource_type",
    "audience_hypothesis",
    "public_promise",
    "learning_question",
    "status",
    "owner",
    "evidence",
    "risk",
    "brand_review_status",
    "web_status",
    "mailerlite_status",
    "crm_signal_status",
    "onboarding_handoff_status",
    "next_gate",
  ],
  wipLimits: {
    liveAdjacentLaunches: 1,
    noLivePrepLaunches: 2,
  },
};

const readinessBoard = {
  ok: true,
  launch: {
    launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
    resourceName: "Inteligencia para descansar",
    resourceType: "quiz",
  },
};

const reviewPacketsIndex = {
  ok: true,
  pendingDepartments: ["brand", "web_design", "crm"],
};

const operatorRunbook = {
  status: "mailerlite_launch_os_operator_runbook_ready_no_live_changes",
  currentState: {
    approvalQueue: {
      readyApprovalIds: [],
      blockedApprovalIds: ["mini_launch_seed_send", "crm_signal_writes"],
    },
    miniLaunch: {
      currentPilot: readinessBoard.launch,
      acceptedFinalDepartments: ["brand", "web_design", "crm"],
      departmentResponseStates: [
        { department: "brand", acceptedFinalResponse: true },
        { department: "web_design", acceptedFinalResponse: true },
        { department: "crm", acceptedFinalResponse: true },
      ],
      emailManualUiBuildClosed: true,
      emailManualUiDraftVisibleCount: 4,
      seedTestQaRealMailerLiteRenderQaReady: true,
      seedTestQaSeedRecipientSupplied: false,
      seedTestQaTargetGroupsExist: true,
      seedTestQaBlockersBeforeApprovalRequest: ["exact_seed_recipient_missing"],
      shopifyLocalBuildClosed: true,
      onboardingHandoffPolicyStatus: "mini_launch_onboarding_handoff_policy_ready_no_live_changes",
    },
  },
};

const approvalQueue = {
  executiveSummary: {
    readyApprovalIds: [],
    blockedApprovalIds: ["mini_launch_seed_send", "crm_signal_writes"],
  },
};

const seedSendApprovalPacket = {
  status: "seed_send_approval_packet_waiting_exact_seed_recipient_no_live_changes",
  blockers: ["exact_seed_recipient_missing"],
  executiveSummary: {
    seedRecipientSupplied: false,
    realMailerLiteRenderQaReady: true,
    targetGroupsExist: true,
  },
};

const crmWriteApprovalPacket = {
  status: "crm_write_approval_packet_blocked_missing_observed_events_no_live_changes",
  executiveSummary: {
    writePolicyPacketReady: true,
    blockers: [
      "real_observed_event_file_missing",
      "exact_observed_events_missing",
    ],
  },
};

const sourceDigests = [
  {
    path: "/tmp/cadence.json",
    present: true,
    chars: 1000,
    consultedFor: "cadence strategy, WIP limits and backlog fields",
  },
];

describe("CRM vNext MailerLite mini-launch backlog board", () => {
  test("normalizes default args and report outputs", () => {
    const parsed = parseArgs([
      "--out",
      "/tmp/backlog.json",
      "--markdown-out",
      "/tmp/backlog.md",
    ]);

    expect(parsed.cadenceBoard).toContain("mailerlite_mini_launch_cadence_board_2026-05-27.json");
    expect(parsed.readinessBoard).toContain("mailerlite_mini_launch_readiness_board_inteligencia_descansar_2026-05-27.json");
    expect(parsed.reviewPacketsIndex).toContain("mailerlite_mini_launch_department_review_packets_index_inteligencia_descansar_2026-05-27.json");
    expect(parsed.operatorRunbook).toContain("mailerlite_launch_os_operator_runbook_2026-05-28.json");
    expect(parsed.seedSendApprovalPacket).toContain("mailerlite_mini_launch_seed_send_approval_packet_inteligencia_descansar_2026-05-28.json");
    expect(parsed.out).toBe("/tmp/backlog.json");
    expect(parsed.markdownOut).toBe("/tmp/backlog.md");
  });

  test("builds idea template from cadence backlog fields", () => {
    const template = buildIdeaTemplate(cadenceBoard);

    expect(template.fields).toContain("learning_question");
    expect(template.allowedResourceTypes).toContain("quiz");
    expect(template.allowedStatuses).toContain("department_review_pending");
    expect(template.requiredBeforeIntakeReady).toEqual([
      "theme",
      "resource_type",
      "audience_hypothesis",
      "public_promise",
      "learning_question",
    ]);
  });

  test("builds current pilot backlog row without opening live gates", () => {
    const row = buildCurrentPilotRow({ readinessBoard, reviewPacketsIndex });

    expect(row).toMatchObject({
      idea_id: "mini_2026_06_rehearsal_inteligencia_para_descansar",
      theme: "Inteligencia para descansar",
      resource_type: "quiz",
      status: "department_review_pending",
      brand_review_status: "pending",
      web_status: "pending",
      crm_signal_status: "pending",
      onboarding_handoff_status: "protected_no_auto_routing",
      next_gate: "collect_department_reviews",
    });
    expect(row.mailerlite_status).toBe("no_live_groups_or_assets");
  });

  test("builds current pilot row from runbook boundaries after UI draft build", () => {
    const row = buildCurrentPilotRow({
      readinessBoard,
      reviewPacketsIndex,
      operatorRunbook,
      approvalQueue,
      seedSendApprovalPacket,
      crmWriteApprovalPacket,
    });

    expect(row).toMatchObject({
      status: "seed_test_candidate_blocked_waiting_seed_recipient",
      brand_review_status: "accepted_final_response",
      web_status: "accepted_local_build_closed_no_live",
      mailerlite_status: "manual_ui_drafts_built_real_render_green_seed_send_closed",
      crm_signal_status: "policy_ready_waiting_real_observed_events",
      onboarding_handoff_status: "policy_ready_protected_no_auto_routing",
      next_gate: "exact_seed_recipient_for_test_send",
    });
    expect(row.readiness).toMatchObject({
      manualDraftsBuilt: true,
      realMailerLiteRenderQaGreen: true,
      seedRecipientSupplied: false,
      crmWritePolicyReady: true,
    });
    expect(row.blockers).toEqual(expect.arrayContaining([
      "exact_seed_recipient_missing",
      "real_observed_event_file_missing",
    ]));
  });

  test("calculates WIP capacity for one more no-live idea only", () => {
    const row = buildCurrentPilotRow({ readinessBoard, reviewPacketsIndex });
    const snapshot = buildWipSnapshot({
      cadenceBoard,
      backlogRows: [row],
    });

    expect(snapshot.activeNoLivePrep).toBe(1);
    expect(snapshot.remainingNoLivePrepCapacity).toBe(1);
    expect(snapshot.safeToIntakeOneMoreNoLiveIdea).toBe(true);
    expect(snapshot.safeToOpenLiveAdjacentLaunch).toBe(false);
  });

  test("counts seed-test boundary as live-adjacent without opening live gates", () => {
    const row = buildCurrentPilotRow({
      readinessBoard,
      reviewPacketsIndex,
      operatorRunbook,
      approvalQueue,
      seedSendApprovalPacket,
      crmWriteApprovalPacket,
    });
    const snapshot = buildWipSnapshot({
      cadenceBoard,
      backlogRows: [row],
    });

    expect(snapshot.activeNoLivePrep).toBe(0);
    expect(snapshot.activeLiveAdjacent).toBe(1);
    expect(snapshot.remainingLiveAdjacentCapacity).toBe(0);
    expect(snapshot.safeToIntakeOneMoreNoLiveIdea).toBe(true);
    expect(snapshot.safeToOpenLiveAdjacentLaunch).toBe(false);
  });

  test("builds backlog board with all live gates closed", () => {
    const board = buildBacklogBoard({
      cadenceBoard,
      readinessBoard,
      reviewPacketsIndex,
      sourceDigests,
      generatedAt: "2026-05-27T00:00:00.000Z",
    });

    expect(board.status).toBe("mini_launch_backlog_board_ready_no_live_changes");
    expect(board.backlogRows).toHaveLength(1);
    expect(board.wipSnapshot.safeToIntakeOneMoreNoLiveIdea).toBe(true);
    expect(board.gateDefaults.every((gate) => gate.status === "closed_by_default")).toBe(true);
    expect(board.safety).toMatchObject({
      mailerLiteApiCalled: false,
      shopifyApiCalled: false,
      groupsCreated: false,
      sendsPerformed: false,
      signalLedgerAppendPerformed: false,
    });
  });

  test("intake policy rejects live or underdefined ideas", () => {
    const policy = buildIntakePolicy();

    expect(policy.defaultDecision).toBe("allow_one_more_no_live_idea_intake_if_fields_are_complete");
    expect(policy.rejectionReasons).toContain("would_require_live_change_now");
    expect(policy.rejectionReasons).toContain("would_auto_route_to_onboarding");
  });

  test("renders backlog board as an operator report", () => {
    const board = buildBacklogBoard({
      cadenceBoard,
      readinessBoard,
      reviewPacketsIndex,
      sourceDigests,
      generatedAt: "2026-05-27T00:00:00.000Z",
    });
    const markdown = renderMarkdown(board);

    expect(markdown).toContain("Mini-Launch Backlog Board");
    expect(markdown).toContain("Safe to intake one more no-live idea: true");
    expect(markdown).toContain("collect_department_reviews");
    expect(markdown).toContain("Blocked approvals");
    expect(markdown).toContain("Sin MailerLite API calls");
    expect(buildGateDefaults().map((gate) => gate.id)).toContain("audience_launch");
    expect(buildSafety()).toMatchObject({ outboundPerformed: false });
  });
});
