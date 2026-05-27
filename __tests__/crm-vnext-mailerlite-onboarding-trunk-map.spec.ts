import { describe, expect, test } from "vitest";

import {
  buildCurrentUse,
  buildOnboardingTrunkMap,
  buildOperatorContract,
  buildSequenceMap,
  parseArgs,
  renderMarkdown,
} from "../scripts/crm-vnext-mailerlite-onboarding-trunk-map.mjs";

const onboardingV1Audit = {
  status: "completed_read_only_audit",
  workflow: {
    id: "wf-1",
    name: "Onboarding flow",
    enabled: true,
    complete: true,
    broken: false,
    stepsCount: 27,
    emailsCount: 2,
    triggers: [
      {
        type: "subscriber_joins_group",
        groups: [{ name: "leads_instagram.csv" }],
      },
    ],
    graph: {
      emailSequence: [
        {
          order: 1,
          subject: "{$name}, Tu primera nota de mi parte",
          name: "Tu primera nota de mi parte",
          contentId: null,
          stats: { sent: 100, opens: 80, clicks: 3, unsubscribes: 1 },
        },
        {
          order: 2,
          subject: "Relaciones que aumentan nuestra energía",
          name: "Segundo correo",
          contentId: "article_relaciones_aumentan_energia",
          stats: { sent: 90, opens: 60, clicks: 2, unsubscribes: 0 },
        },
      ],
    },
  },
  historicalGroups: [
    {
      name: "leads_instagram.csv",
      role: "trigger_source",
      activeCount: 674,
      vNextMapping: "CC · Source · IG onboarding",
      recommendedPosture: "do_not_touch_map_later",
      risk: "Nombre tecnico historico; no usar como lenguaje semantico nuevo.",
    },
    {
      name: "Onboarding complete",
      role: "legacy_completion_and_campaign_audience",
      activeCount: 933,
      vNextMapping: "CC · Journey · Editorial onboarding · Complete + CC · Audience · General newsletter · Eligible",
      recommendedPosture: "keep_live_until_migration",
      risk: "Mezcla completion de recorrido con elegibilidad de audiencia.",
    },
  ],
};

const onboardingV2Design = {
  decision: {
    recommendedOption: "option_b_light_clone_onboarding_v2_then_switch_entry",
  },
  workflowBlueprint: {
    productionV1Posture: "keep_live_untouched",
    proposedWorkflowName: "Onboarding editorial v2 - DRAFT",
    trigger: {
      group: { name: "CC · Journey · Editorial onboarding · Eligible" },
      rationale: "Disparar por elegibilidad limpia de recorrido.",
    },
    emailReceipts: [
      {
        order: 1,
        recommendedReceiptGroup: null,
        dictionaryStatus: "needs_brand_content_mapping",
        v2Action: "ask_brand_to_define_content_id_before_receipt_group",
        safetyNote: "No inventar recibo para la bienvenida.",
      },
      {
        order: 2,
        recommendedReceiptGroup: "CC · Sent · Article · Relaciones que aumentan nuestra energia",
        dictionaryStatus: "proposed_local",
        v2Action: "mark_sent_after_email_in_v2_if_persistent_add_action_is_verified",
        safetyNote: "Sent no significa lectura.",
      },
    ],
    completionActions: [
      {
        action: "mark_journey_complete",
        group: { name: "CC · Journey · Editorial onboarding · Complete", status: "proposed_local" },
      },
      {
        action: "mark_general_newsletter_eligible",
        group: { name: "CC · Audience · General newsletter · Eligible", status: "live_canonical" },
      },
    ],
  },
  groupWorkNeededBeforeV2Pilot: {
    missingOrProposedGroups: [
      {
        name: "CC · Journey · Editorial onboarding · In progress",
        layer: "Journey",
        status: "proposed_local",
        meaning: "Persona esta atravesando el onboarding editorial.",
      },
    ],
  },
  approvalGates: [
    {
      gate: "clone_or_build_disabled_v2_workflow",
      allowedNow: false,
      approvalNeeded: "Aprobacion humana para crear/clonar un workflow draft apagado.",
    },
  ],
};

const onboardingHandoffPolicy = {
  launch: {
    launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
  },
  targetGroups: {
    eligible: "CC · Journey · Editorial onboarding · Eligible",
  },
  recommendationInputs: [
    {
      id: "consent_and_identity_anchor",
      status: "required_before_any_future_route",
      meaning: "Stable email/personId and no suppression.",
      notEnoughByItself: ["instagram_like", "email_open"],
    },
  ],
  handoffLadder: [
    {
      step: 2,
      action: "recommend_onboarding_handoff",
      currentState: "store_only_event_contract",
      eventKind: "onboarding_handoff_recommended",
      closedGate: "No MailerLite group assignment.",
    },
  ],
  approvalBoundary: {
    closedNow: [
      "Assign any subscriber to onboarding eligibility.",
      "Attach mini-launch participants to active onboarding v1.",
    ],
  },
};

const cadenceBoard = {
  cadenceStrategy: {
    currentCadence: "weekly",
    fasterCadenceCondition: "after two rehearsals plus one seed test",
  },
  currentPilot: {
    launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
  },
};

describe("CRM vNext MailerLite onboarding trunk map", () => {
  test("normalizes default paths and outputs", () => {
    const parsed = parseArgs(["--out", "/tmp/trunk.json", "--markdown-out", "/tmp/trunk.md"]);

    expect(parsed.onboardingV1Audit).toContain("mailerlite_onboarding_v1_audit_2026-05-27.json");
    expect(parsed.onboardingV2Design).toContain("mailerlite_onboarding_v2_decision_design_packet_2026-05-27.json");
    expect(parsed.onboardingHandoffPolicy).toContain("mailerlite_mini_launch_onboarding_handoff_policy_inteligencia_descansar_2026-05-27.json");
    expect(parsed.cadenceBoard).toContain("mailerlite_mini_launch_cadence_board_2026-05-27.json");
    expect(parsed.out).toBe("/tmp/trunk.json");
    expect(parsed.markdownOut).toBe("/tmp/trunk.md");
  });

  test("maps current productive onboarding as the protected trunk", () => {
    const currentUse = buildCurrentUse(onboardingV1Audit);

    expect(currentUse.role).toBe("protected_relationship_deepening_trunk");
    expect(currentUse.workflow).toMatchObject({
      name: "Onboarding flow",
      enabled: true,
      complete: true,
      broken: false,
    });
    expect(currentUse.trigger).toMatchObject({
      historicalGroup: "leads_instagram.csv",
      vNextSourceMapping: "CC · Source · IG onboarding",
    });
    expect(currentUse.currentAudience).toMatchObject({
      historicalGroup: "Onboarding complete",
      activeCount: 933,
      posture: "keep_live_until_migration",
    });
  });

  test("keeps Email 1 welcome-only and maps article receipts separately", () => {
    const sequence = buildSequenceMap({ audit: onboardingV1Audit, design: onboardingV2Design });

    expect(sequence).toHaveLength(2);
    expect(sequence[0].v2ReceiptPlan).toMatchObject({
      posture: "welcome_orientation_no_sent_receipt",
      recommendedGroup: null,
    });
    expect(sequence[1].v2ReceiptPlan).toMatchObject({
      posture: "sent_receipt_after_email_if_v2_action_verified",
      recommendedGroup: "CC · Sent · Article · Relaciones que aumentan nuestra energia",
    });
    expect(sequence[1].operatorRule).toContain("no prueba lectura");
  });

  test("builds the future architecture without opening routing", () => {
    const map = buildOnboardingTrunkMap({
      onboardingV1Audit,
      onboardingV2Design,
      onboardingHandoffPolicy,
      cadenceBoard,
      generatedAt: "2026-05-27T00:00:00.000Z",
    });

    expect(map.status).toBe("onboarding_trunk_map_ready_no_live_changes");
    expect(map.executiveSummary).toMatchObject({
      workflow: "Onboarding flow",
      sequenceItems: 2,
      currentAudienceGroup: "Onboarding complete",
      futureHandoffTarget: "CC · Journey · Editorial onboarding · Eligible",
      recommendationIsRouting: false,
      liveActionAllowedNow: false,
    });
    expect(map.futureArchitecture.miniLaunchRelationship).toMatchObject({
      role: "marked_entry_points_and_market_learning_tributaries",
      currentPilot: "mini_2026_06_rehearsal_inteligencia_para_descansar",
      handoffTargetGroup: "CC · Journey · Editorial onboarding · Eligible",
      recommendationIsRouting: false,
    });
    expect(map.safety.mailerLiteApiCalled).toBe(false);
    expect(map.safety.workflowsMutated).toBe(false);
  });

  test("builds a strict operator contract", () => {
    const contract = buildOperatorContract({ handoffPolicy: onboardingHandoffPolicy, design: onboardingV2Design });

    expect(contract.invariants).toContain("A mini-launch recommendation is not a MailerLite group assignment.");
    expect(contract.closedNow.join(" ")).toContain("Assign any subscriber to onboarding eligibility");
    expect(contract.closedNow.join(" ")).toContain("clone_or_build_disabled_v2_workflow");
    expect(contract.laterApprovalMustName).toContain("rollback/reinsert plan if any production onboarding state is touched");
  });

  test("renders a human-readable map for operators", () => {
    const map = buildOnboardingTrunkMap({
      onboardingV1Audit,
      onboardingV2Design,
      onboardingHandoffPolicy,
      cadenceBoard,
      generatedAt: "2026-05-27T00:00:00.000Z",
    });
    const markdown = renderMarkdown(map);

    expect(markdown).toContain("Onboarding Trunk Map");
    expect(markdown).toContain("protected_relationship_deepening_trunk");
    expect(markdown).toContain("CC · Journey · Editorial onboarding · Eligible");
    expect(markdown).toContain("Recommendation is not routing.");
    expect(markdown).toContain("No MailerLite, Shopify or CRM live API calls.");
  });
});
