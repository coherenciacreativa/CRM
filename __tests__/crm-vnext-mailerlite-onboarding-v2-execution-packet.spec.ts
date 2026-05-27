import { describe, expect, test } from "vitest";

import {
  buildCreateEmptyGroupsGate,
  buildExecutionPacket,
  buildGateQueue,
  buildNextAutonomousMoves,
  parseArgs,
  renderMarkdown,
  targetIsSafeEmptyCreate,
} from "../scripts/crm-vnext-mailerlite-onboarding-v2-execution-packet.mjs";

const designPacket = {
  status: "ready_for_human_architecture_review",
  decision: {
    recommendedOption: "option_b_light_clone_onboarding_v2_then_switch_entry",
  },
  workflowBlueprint: {
    productionV1Posture: "keep_live_untouched",
  },
  groupWorkNeededBeforeV2Pilot: {
    missingOrProposedGroups: [{ name: "CC · Source · IG onboarding" }],
  },
  brandHandoff: {
    needsBrandMapping: [{ order: 1, subject: "{$name}, Tu primera nota de mi parte" }],
  },
};

const emptyGroupsPacket = {
  status: "ready_for_exact_human_approval_to_create_empty_groups",
  blockers: [],
  sourceEvidence: {
    onboardingV1: {
      name: "Onboarding flow",
      enabled: true,
      complete: true,
      broken: false,
    },
    onboardingV2Draft: {
      name: "Onboarding editorial v2 - DRAFT",
      found: false,
    },
  },
  targetPlan: [
    {
      name: "CC · Source · IG onboarding",
      existsInFreshScan: false,
      canCreateEmptyAfterExplicitApproval: true,
      workflowUseAllowed: false,
      subscriberAssignmentAllowed: false,
    },
  ],
};

const emptyGroupsCreateRun = {
  status: "dry_run_ready_for_exact_approval",
  mode: "dry_run",
  createdGroups: [],
  errors: [],
  decision: {
    blockers: [],
    expectedPhrase: "Apruebo crear únicamente estos 1 grupos vacíos de Onboarding v2 en MailerLite, sin subscribers, sin workflows, sin automatizaciones, sin envíos, sin tocar Onboarding v1 y con re-scan fresco previo: CC · Source · IG onboarding.",
    targetPlan: emptyGroupsPacket.targetPlan,
  },
};

const miniLaunchPacket = {
  status: "mini_launch_architecture_ready_for_reuse",
  launchTemplate: {
    launchId: "mini_launch_template_v0",
  },
  defaultEmailSequence: [{ step: 1 }, { step: 2 }, { step: 3 }, { step: 4 }],
};

const firstEmailMapping = {
  status: "first_email_mapping_ready_no_sent_receipt",
  decision: {
    recommendedPosture: "welcome_orientation_no_sent_receipt",
    recommendedContentId: null,
    recommendedMailerLiteSentGroup: null,
  },
};

describe("CRM vNext MailerLite onboarding v2 execution packet", () => {
  test("uses current report paths by default", () => {
    const options = parseArgs([]);

    expect(options.designPacket).toContain("mailerlite_onboarding_v2_decision_design_packet_2026-05-27.json");
    expect(options.emptyGroupsPacket).toContain("mailerlite_onboarding_v2_empty_groups_dry_run_packet_2026-05-27.json");
    expect(options.emptyGroupsCreateRun).toContain("mailerlite_onboarding_v2_empty_groups_create_dry_run_2026-05-27.json");
    expect(options.miniLaunchPacket).toContain("mailerlite_mini_launch_os_v0_packet_2026-05-27.json");
    expect(options.firstEmailMapping).toContain("mailerlite_onboarding_v2_first_email_mapping_2026-05-27.json");
  });

  test("only treats empty group targets as safe when workflow and subscriber use remain closed", () => {
    expect(targetIsSafeEmptyCreate(emptyGroupsPacket.targetPlan[0])).toBe(true);
    expect(targetIsSafeEmptyCreate({
      ...emptyGroupsPacket.targetPlan[0],
      workflowUseAllowed: true,
    })).toBe(false);
    expect(targetIsSafeEmptyCreate({
      ...emptyGroupsPacket.targetPlan[0],
      subscriberAssignmentAllowed: true,
    })).toBe(false);
  });

  test("marks the empty-groups gate ready for exact human approval but still forbids workflow use", () => {
    const gate = buildCreateEmptyGroupsGate({ emptyGroupsPacket, emptyGroupsCreateRun });

    expect(gate).toMatchObject({
      id: "create_empty_onboarding_v2_groups",
      status: "ready_for_exact_human_approval",
      readyForHumanApproval: true,
      allowedWithoutHumanApproval: false,
      allowedOperationAfterApproval: "create_named_empty_groups_only",
    });
    expect(gate.stillForbiddenAfterApproval).toContain("create or edit workflows");
    expect(gate.exactApprovalPhrase).toContain("sin tocar Onboarding v1");
  });

  test("keeps draft, seed, and production gates closed while allowing non-live work", () => {
    const gateQueue = buildGateQueue({
      designPacket,
      emptyGroupsPacket,
      emptyGroupsCreateRun,
      miniLaunchPacket,
      firstEmailMapping,
    });

    expect(gateQueue.find((gate) => gate.id === "build_or_clone_disabled_onboarding_v2_draft")).toMatchObject({
      readyForHumanApproval: false,
      allowedWithoutHumanApproval: false,
      liveMutationIfApproved: true,
    });
    expect(gateQueue.find((gate) => gate.id === "seed_test_onboarding_v2")?.status).toContain("blocked");
    expect(gateQueue.find((gate) => gate.id === "non_live_mini_launch_rehearsal")).toMatchObject({
      status: "ready_without_live_approval",
      allowedWithoutHumanApproval: true,
      liveMutationIfApproved: false,
    });
    expect(gateQueue.find((gate) => gate.id === "brand_first_email_content_mapping")).toMatchObject({
      status: "mapped_as_welcome_only_no_sent_receipt",
      allowedWithoutHumanApproval: false,
      liveMutationIfApproved: false,
    });
  });

  test("builds next autonomous moves without treating live changes as autonomous", () => {
    const gateQueue = buildGateQueue({
      designPacket,
      emptyGroupsPacket,
      emptyGroupsCreateRun,
      miniLaunchPacket,
      firstEmailMapping,
    });
    const moves = buildNextAutonomousMoves(gateQueue);

    expect(moves.some((move) => move.gate === "non_live_mini_launch_rehearsal")).toBe(true);
    expect(moves.find((move) => move.gate === "create_empty_onboarding_v2_groups")?.action).toContain("Pause for exact human approval");
  });

  test("renders a board-ready packet with v1 preservation and approval boundaries", () => {
    const packet = buildExecutionPacket({
      designPacket,
      emptyGroupsPacket,
      emptyGroupsCreateRun,
      miniLaunchPacket,
      firstEmailMapping,
      blueprintText: "blueprint",
      sourcePaths: {
        designPacket: "/tmp/design.json",
        emptyGroupsPacket: "/tmp/empty-packet.json",
        emptyGroupsCreateRun: "/tmp/create-run.json",
        miniLaunchPacket: "/tmp/mini.json",
        firstEmailMapping: "/tmp/first-email.json",
        blueprint: "/tmp/blueprint.md",
      },
      generatedAt: "2026-05-27T00:00:00.000Z",
    });
    const markdown = renderMarkdown(packet);

    expect(packet.status).toBe("ready_for_human_decision_or_non_live_continuation");
    expect(packet.executiveDecision.humanApprovalRequiredFor).toContain("touching Onboarding v1");
    expect(markdown).toContain("Onboarding flow v1 stays live and untouched");
    expect(markdown).toContain("Do not infer Sobre el amor from Received second email.");
    expect(markdown).toContain("First email mapping: first_email_mapping_ready_no_sent_receipt; posture=welcome_orientation_no_sent_receipt");
    expect(markdown).toContain("Sin grupos/workflows/automations/envios.");
  });
});
