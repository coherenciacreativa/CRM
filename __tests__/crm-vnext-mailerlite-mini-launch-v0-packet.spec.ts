import { describe, expect, test } from "vitest";

import {
  buildApprovalGates,
  buildDefaultEmailSequence,
  buildMiniLaunchPacket,
  buildPublicSurfaceGuardrails,
  buildReceiptPlan,
  buildSuccessMetrics,
  parseArgs,
  renderMarkdown,
} from "../scripts/crm-vnext-mailerlite-mini-launch-v0-packet.mjs";

const sourceDigests = [
  {
    path: "/Users/alejandrogomez/Projects/hub-de-marca/05_brand_department_os/LEAD_MAGNET_OPERATING_PATTERN_V0_1.md",
    present: true,
    chars: 100,
    consultedFor: "mini-product sequence and public/internal separation",
  },
  {
    path: "/Users/alejandrogomez/Projects/hub-de-marca/05_brand_department_os/END_TO_END_CREATIVE_QA_PROTOCOL.md",
    present: true,
    chars: 100,
    consultedFor: "functional/creative QA gates",
  },
];

describe("CRM vNext MailerLite Mini-Launch OS v0 packet", () => {
  test("normalizes CLI args into stable local-only template inputs", () => {
    const options = parseArgs([
      "--launch-id",
      "Mini 2026/06/07 Inteligencia para Descansar",
      "--resource-name",
      "inteligencia para descansar",
      "--resource-type",
      "quiz",
    ]);

    expect(options).toMatchObject({
      launchId: "mini_2026_06_07_inteligencia_para_descansar",
      resourceName: "Inteligencia Para Descansar",
      resourceType: "quiz",
    });
  });

  test("builds receipt plan with Brand-safe Resource/Guide language and CRM-first experiment identity", () => {
    const plan = buildReceiptPlan({
      launchId: "mini_2026_06_07_inteligencia_descanso",
      resourceName: "Inteligencia Para Descansar",
      resourceType: "quiz",
    });

    expect(plan.sourceGroup).toBe("CC · Source · Quiz · Inteligencia Para Descansar");
    expect(plan.deliveredGroup).toBe("CC · Delivered · Quiz result · Inteligencia Para Descansar");
    expect(plan.sourceGroup).not.toContain("Lead magnet");
    expect(plan.experimentPosture).toMatchObject({
      crmFirst: true,
      crmKey: "experiment.launch_id=mini_2026_06_07_inteligencia_descanso",
      mailerLiteExperimentGroupDefault: null,
    });
  });

  test("keeps every live approval gate closed by default", () => {
    const gates = buildApprovalGates();

    expect(gates).toHaveLength(6);
    expect(gates.every((gate) => gate.allowedNow === false)).toBe(true);
    expect(gates.map((gate) => gate.gate)).toEqual([
      "create_empty_groups",
      "shopify_preview_or_publish",
      "create_or_edit_mailerlite_workflow",
      "seed_test_send",
      "audience_send",
      "crm_card_or_score_mutation",
    ]);
  });

  test("defines a small default email sequence without authorizing sends", () => {
    const emails = buildDefaultEmailSequence();

    expect(emails).toHaveLength(4);
    expect(emails.map((email) => email.role)).toEqual([
      "delivery_and_orientation",
      "practice_or_value",
      "story_or_editorial_depth",
      "invitation_or_feedback",
    ]);
    expect(emails.every((email) => email.sendPosture === "draft_or_test_only_until_approved")).toBe(true);
  });

  test("guards public surfaces from internal operating language", () => {
    const guardrails = buildPublicSurfaceGuardrails();

    expect(guardrails.separationRequired).toBe(true);
    expect(guardrails.bannedInternalTermsInPublicCopy).toEqual(expect.arrayContaining([
      "lead magnet",
      "CRM",
      "MailerLite",
      "automatizacion",
    ]));
    expect(guardrails.publicSurfaces).toContain("email body");
    expect(guardrails.internalSurfaces).toContain("automation plan");
  });

  test("builds full packet with Shopify, MailerLite, CRM, Brand and QA lanes", () => {
    const packet = buildMiniLaunchPacket({
      generatedAt: "2026-05-27T00:00:00.000Z",
      sourceDigests,
      options: {
        launchId: "mini_launch_template_v0",
        resourceName: "Mini Launch Template",
        resourceType: "guide",
      },
    });

    expect(packet.mode).toBe("local_only_mailerlite_launch_os_mini_launch_v0_packet");
    expect(packet.safety).toMatchObject({
      mailerLiteApiCalled: false,
      sendsPerformed: false,
      workflowMutationsPerformed: false,
      crmCardMutationsPerformed: false,
    });
    expect(packet.operatingSequence.map((phase) => phase.phase)).toEqual(expect.arrayContaining([
      "web_shopify_preview_or_handoff",
      "mailerlite_draft_test_lane",
      "crm_signal_plan",
      "qa_functional_creative",
      "learning_loop",
    ]));
    expect(packet.crmSignalMap.map((signal) => signal.event)).toEqual(expect.arrayContaining([
      "landing_preview_ready",
      "resource_delivered",
      "ig_signal_observed",
      "quiz_or_game_completed",
      "continue_or_archive_decision",
    ]));
  });

  test("renders executive handoff with gates, metrics and consulted sources", () => {
    const packet = buildMiniLaunchPacket({
      generatedAt: "2026-05-27T00:00:00.000Z",
      sourceDigests,
      options: {
        launchId: "mini_launch_template_v0",
        resourceName: "Mini Launch Template",
        resourceType: "guide",
      },
    });
    const markdown = renderMarkdown(packet);

    expect(markdown).toContain("Mini-Launch Operating Packet");
    expect(markdown).toContain("Shopify/Web");
    expect(markdown).toContain("allowedNow=false");
    expect(markdown).toContain("Metricas De Exito");
    expect(markdown).toContain("Sin MailerLite API calls.");
    expect(markdown).toContain(sourceDigests[0].path);
  });

  test("success metrics include learning decision and safety", () => {
    expect(buildSuccessMetrics()).toMatchObject({
      learningDecision: expect.stringContaining("continue"),
      safety: expect.stringContaining("aprobacion explicita"),
    });
  });
});
