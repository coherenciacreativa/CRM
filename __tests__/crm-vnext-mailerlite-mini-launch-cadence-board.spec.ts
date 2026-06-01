import { describe, expect, test } from "vitest";

import {
  buildBacklogFields,
  buildCadenceBoard,
  buildCadenceStrategy,
  buildGateDefaults,
  buildOperatingRhythm,
  buildPipelineStages,
  buildProposalEngineRoadmap,
  buildRoutingPolicy,
  buildWipLimits,
  parseArgs,
  renderMarkdown,
} from "../scripts/crm-vnext-mailerlite-mini-launch-cadence-board.mjs";

const readinessBoard = {
  ok: true,
  status: "mini_launch_readiness_board_ready_no_live_changes",
  launch: {
    launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
    resourceName: "Inteligencia para descansar",
    resourceType: "quiz",
  },
  executiveSummary: {
    overallState: "ready_for_department_reviews_not_ready_for_live_operation",
    readyNoLiveLaneCount: 8,
    liveMutationGateOpenCount: 0,
    nextBestNoLiveMoves: [
      "Brand reviews the full email sequence and group candidate semantics.",
      "Web Design reviews/builds from the Shopify handoff only if scope is accepted.",
    ],
  },
};

const launchOsPacket = {
  ok: true,
  status: "mini_launch_os_v0_packet_ready_no_live_changes",
};

const sourceDigests = [
  {
    path: "/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_readiness_board_inteligencia_descansar_2026-05-27.json",
    present: true,
    chars: 1000,
    consultedFor: "current pilot state and live-gate posture",
  },
];

describe("CRM vNext MailerLite mini-launch cadence board", () => {
  test("normalizes default args and report outputs", () => {
    const parsed = parseArgs([
      "--out",
      "/tmp/cadence.json",
      "--markdown-out",
      "/tmp/cadence.md",
    ]);

    expect(parsed.readinessBoard).toContain("mailerlite_mini_launch_readiness_board_inteligencia_descansar_2026-05-27.json");
    expect(parsed.launchOsPacket).toContain("mailerlite_mini_launch_os_v0_packet_2026-05-27.json");
    expect(parsed.controlRoom).toContain("mailerlite-launch-os-v0-control-room.md");
    expect(parsed.out).toBe("/tmp/cadence.json");
    expect(parsed.markdownOut).toBe("/tmp/cadence.md");
  });

  test("builds weekly first and every-three-days later strategy", () => {
    const strategy = buildCadenceStrategy();

    expect(strategy.currentRecommendation).toBe("weekly_first_then_every_3_days_after_throughput_proof");
    expect(strategy.phases.map((phase) => phase.cadence)).toEqual(["weekly", "every_3_days"]);
    expect(strategy.phases[0].advanceCriteria.join(" ")).toContain("Two no-live mini-launch rehearsals");
    expect(strategy.phases[1].status).toBe("not_active_until_phase_1_evidence");
  });

  test("sets WIP limits that prevent multiple live-adjacent fronts", () => {
    const limits = buildWipLimits();

    expect(limits.liveAdjacentLaunches).toBe(1);
    expect(limits.noLivePrepLaunches).toBe(2);
    expect(limits.activeMailerLiteSeedTests).toBe(1);
    expect(limits.rule).toContain("avoid hidden debt");
  });

  test("pipeline stages protect Brand, Web, CRM, MailerLite and onboarding boundaries", () => {
    const stages = buildPipelineStages();
    const ids = stages.map((stage) => stage.id);

    expect(ids).toEqual([
      "market_learning_proposal",
      "idea_intake",
      "brand_brief",
      "web_shopify_handoff",
      "resource_or_quiz_or_game_production",
      "email_sequence",
      "brand_candidate_review",
      "group_dry_run",
      "seed_test_qa",
      "exact_approval_live_adjacent_step",
      "market_signal_review",
      "continue_archive_decision",
    ]);
    expect(stages.find((stage) => stage.id === "market_learning_proposal")?.definitionOfDone.join(" ")).toContain("ranked proposal packet");
    expect(stages.find((stage) => stage.id === "seed_test_qa")?.definitionOfReady).toContain("exact test recipient");
    expect(stages.find((stage) => stage.id === "market_signal_review")?.definitionOfDone.join(" ")).toContain("no automatic CRM writes");
    expect(stages.find((stage) => stage.id === "exact_approval_live_adjacent_step")?.liveGate).toBe("human_required");
  });

  test("designs an autonomous proposal engine without granting live authority", () => {
    const roadmap = buildProposalEngineRoadmap();

    expect(roadmap.status).toBe("future_lane_designed_not_current_execution_scope");
    expect(roadmap.firstCadenceTarget).toBe("weekly_ceo_proposal_packet");
    expect(roadmap.futureCadenceTarget).toBe("every_3_days_after_weekly_loop_is_stable");
    expect(roadmap.decisionArtifact.requiredSections).toContain("crm_learning_goal");
    expect(roadmap.decisionArtifact.requiredSections).toContain("smallest_responsible_test_audience");
    expect(roadmap.preferredFormats).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "tests_or_quizzes", priority: "primary" }),
      expect.objectContaining({ id: "small_interactive_games", priority: "secondary" }),
    ]));
    expect(roadmap.guardrails.join(" ")).toContain("not approval to build");
    expect(roadmap.guardrails.join(" ")).toContain("CRM signals");
  });

  test("routing policy keeps onboarding as the protected trunk", () => {
    const policy = buildRoutingPolicy();

    expect(policy.brand).toContain("semantic status");
    expect(policy.strategy).toContain("proposal engine");
    expect(policy.webDesign).toContain("Shopify-native");
    expect(policy.crm).toContain("relationship intelligence");
    expect(policy.onboarding).toContain("Protected trunk");
  });

  test("builds cadence board with all live gates closed", () => {
    const board = buildCadenceBoard({
      readinessBoard,
      launchOsPacket,
      sourceDigests,
      generatedAt: "2026-05-27T00:00:00.000Z",
    });

    expect(board.status).toBe("mini_launch_cadence_board_ready_no_live_changes");
    expect(board.currentPilot).toMatchObject({
      state: "ready_for_department_reviews_not_ready_for_live_operation",
      liveMutationGateOpenCount: 0,
    });
    expect(board.metrics).toMatchObject({
      pipelineStageCount: 12,
      openLiveGateCount: 0,
      proposalEngineRoadmapReady: true,
    });
    expect(board.proposalEngineRoadmap.firstCadenceTarget).toBe("weekly_ceo_proposal_packet");
    expect(board.gateDefaults.every((gate) => gate.status === "closed_by_default")).toBe(true);
    expect(board.safety).toMatchObject({
      mailerLiteApiCalled: false,
      sendsPerformed: false,
      crmCardMutationsPerformed: false,
    });
  });

  test("operating rhythm and backlog are concrete enough for repeatable launch work", () => {
    const rhythm = buildOperatingRhythm();
    const fields = buildBacklogFields();
    const gates = buildGateDefaults();

    expect(rhythm.activeCadenceNow).toBe("weekly");
    expect(rhythm.every3DaysStatus).toBe("designed_but_not_active");
    expect(rhythm.weekly[0]).toContain("proposal engine prepares a CEO packet");
    expect(fields).toContain("proposal_engine_status");
    expect(fields).toContain("preferred_format");
    expect(fields).toContain("learning_question");
    expect(fields).toContain("onboarding_handoff_status");
    expect(gates.map((gate) => gate.id)).toContain("audience_launch");
  });

  test("renders a low-noise operator report", () => {
    const board = buildCadenceBoard({
      readinessBoard,
      launchOsPacket,
      sourceDigests,
      generatedAt: "2026-05-27T00:00:00.000Z",
    });
    const markdown = renderMarkdown(board);

    expect(markdown).toContain("Mini-Launch Cadence Board");
    expect(markdown).toContain("Cadencia activa recomendada: weekly");
    expect(markdown).toContain("Cadencia cada 3 dias: designed_but_not_active");
    expect(markdown).toContain("## Proposal Engine Roadmap");
    expect(markdown).toContain("tests_or_quizzes");
    expect(markdown).toContain("small_interactive_games");
    expect(markdown).toContain("## WIP Limits");
    expect(markdown).toContain("Do not route participants into onboarding automatically");
    expect(markdown).toContain("Sin emails enviados");
  });
});
