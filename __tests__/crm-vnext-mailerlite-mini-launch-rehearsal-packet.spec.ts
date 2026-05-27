import { describe, expect, test } from "vitest";

import {
  buildApprovalQueue,
  buildConceptBrief,
  buildDataPlan,
  buildOnboardingHandoff,
  buildQuizModel,
  buildRehearsalPacket,
  buildReceiptCandidates,
  parseArgs,
  renderMarkdown,
} from "../scripts/crm-vnext-mailerlite-mini-launch-rehearsal-packet.mjs";

const options = {
  launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
  resourceName: "Inteligencia para descansar",
  resourceType: "quiz",
  audience: "Personas con cansancio mental.",
  successCriterion: "Registros, replies y senales cualitativas.",
};

const operatingPacket = {
  status: "mini_launch_architecture_ready_for_reuse",
  defaultEmailSequence: [{ step: 1 }, { step: 2 }, { step: 3 }, { step: 4 }],
};

const executionPacket = {
  status: "ready_for_human_decision_or_non_live_continuation",
  gateQueue: [
    {
      id: "non_live_mini_launch_rehearsal",
      status: "ready_without_live_approval",
      allowedWithoutHumanApproval: true,
    },
  ],
};

const sourceDigests = [
  {
    path: "/Users/alejandrogomez/Projects/hub-de-marca/05_brand_department_os/MANTIS_OPERATOR_LAYER.md",
    present: true,
    chars: 100,
    consultedFor: "Brand Department routing and operator posture",
  },
  {
    path: "/Users/alejandrogomez/Projects/hub-de-marca/05_brand_department_os/SHOPIFY_PREVIEW_PROTOCOL.md",
    present: true,
    chars: 100,
    consultedFor: "Shopify/Web preview default and fallback rules",
  },
];

describe("CRM vNext MailerLite mini-launch rehearsal packet", () => {
  test("normalizes default args into a concrete no-live rehearsal", () => {
    const parsed = parseArgs([]);

    expect(parsed).toMatchObject({
      launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
      resourceName: "Inteligencia para descansar",
      resourceType: "quiz",
    });
    expect(parsed.operatingPacket).toContain("mailerlite_mini_launch_os_v0_packet_2026-05-27.json");
    expect(parsed.executionPacket).toContain("mailerlite_onboarding_v2_execution_packet_2026-05-27.json");
  });

  test("builds a concept brief with honest public promise and no overclaiming", () => {
    const brief = buildConceptBrief(options);

    expect(brief.publicPromiseDraft).toContain("test breve");
    expect(brief.notPromises).toEqual(expect.arrayContaining([
      expect.stringContaining("No prometer curar"),
      expect.stringContaining("No diagnosticar"),
    ]));
  });

  test("defines quiz model with questions, result archetypes and practices", () => {
    const quiz = buildQuizModel();

    expect(quiz.status).toBe("draft_rehearsal_only");
    expect(quiz.questions).toHaveLength(5);
    expect(quiz.resultArchetypes).toHaveLength(4);
    expect(quiz.resultArchetypes[0]).toMatchObject({
      id: "espacio_mental",
      publicName: "Descanso por espacio mental",
    });
  });

  test("creates Brand-dictionary candidate receipts without allowing live creation", () => {
    const candidates = buildReceiptCandidates(options);

    expect(candidates.sourceGroupCandidate).toMatchObject({
      name: "CC · Source · Quiz · Inteligencia para descansar",
      status: "brand_dictionary_candidate_before_creation",
      liveCreationAllowedNow: false,
    });
    expect(candidates.deliveredGroupCandidate).toMatchObject({
      name: "CC · Delivered · Quiz result · Inteligencia para descansar",
      liveCreationAllowedNow: false,
    });
    expect(candidates.experimentIdentity).toMatchObject({
      crmFirst: true,
      crmKey: "experiment.launch_id=mini_2026_06_rehearsal_inteligencia_para_descansar",
    });
  });

  test("keeps onboarding handoff safe and v1 untouched", () => {
    const handoff = buildOnboardingHandoff();

    expect(handoff.currentOnboardingV1).toBe("preserve_live_untouched");
    expect(handoff.allowedNow).toBe(false);
    expect(handoff.futureRoute.join(" ")).toContain("No insertar automaticamente");
  });

  test("builds data plan around launch_id and market learning", () => {
    const dataPlan = buildDataPlan(options.launchId);

    expect(dataPlan.primaryKey).toBe("experiment.launch_id=mini_2026_06_rehearsal_inteligencia_para_descansar");
    expect(dataPlan.collectIfInstrumented).toEqual(expect.arrayContaining([
      "quiz_completed",
      "reply_received",
      "ig_comment_or_dm_signal",
    ]));
    expect(dataPlan.marketQuestions[0]).toContain("descanso");
  });

  test("keeps all approval gates closed", () => {
    const gates = buildApprovalQueue();

    expect(gates).toHaveLength(7);
    expect(gates.every((gate) => gate.allowedNow === false)).toBe(true);
    expect(gates.map((gate) => gate.gate)).toContain("audience_launch");
  });

  test("builds and renders a local-only rehearsal packet", () => {
    const packet = buildRehearsalPacket({
      options,
      operatingPacket,
      executionPacket,
      sourceDigests,
      generatedAt: "2026-05-27T00:00:00.000Z",
    });
    const markdown = renderMarkdown(packet);

    expect(packet.status).toBe("mini_launch_rehearsal_ready_no_live_changes");
    expect(packet.readinessEvidence).toMatchObject({
      operatingPacketStatus: "mini_launch_architecture_ready_for_reuse",
      executionGateStatus: "ready_without_live_approval",
      executionGateAllowedWithoutHumanApproval: true,
    });
    expect(packet.safety).toMatchObject({
      mailerLiteApiCalled: false,
      shopifyApiCalled: false,
      sendsPerformed: false,
      crmCardMutationsPerformed: false,
    });
    expect(markdown).toContain("Mini-Launch Rehearsal Packet");
    expect(markdown).toContain("CC · Source · Quiz · Inteligencia para descansar");
    expect(markdown).toContain("Sin grupos/workflows/forms/emails/envios.");
  });
});
