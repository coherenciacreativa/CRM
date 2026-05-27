import { describe, expect, test } from "vitest";

import {
  buildEmailAssetBuildScopePacket,
  exactApprovalPhraseFor,
  parseArgs,
  renderMarkdown,
  validateReadiness,
} from "../scripts/crm-vnext-mailerlite-mini-launch-email-asset-build-scope-packet.mjs";

const launch = {
  launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
  resourceName: "Inteligencia para descansar",
  resourceType: "quiz",
};

const localEmailAssetPlan = {
  ok: true,
  status: "mini_launch_local_email_asset_plan_ready_no_live_changes",
  launch,
  executiveSummary: {
    assetCount: 4,
    placeholderCount: 3,
    readyForExactAssetBuildScopeRequestNow: true,
    readyForMailerLiteAssetBuildNow: false,
    readyForSeedSendNow: false,
  },
  approvalBoundary: {
    readyForExactAssetBuildScopeRequestNow: true,
    readyForMailerLiteAssetBuildNow: false,
    readyForSeedSendNow: false,
    canCreateOrEditMailerLiteAssetsNow: false,
  },
  assetRows: [
    {
      step: 1,
      role: "delivery_and_orientation",
      mailerLiteAssetNameDraft: "ML Draft · descanso · E01 Delivery orientation",
      selectedSubject: "Tu lectura de descanso",
      selectedPreheader: "Una entrada amable.",
      builderBlocks: ["preheader", "greeting", "body_copy", "single_cta"],
      styleImplementation: {
        bodyFont: "Poppins, sans-serif",
      },
      cta: {
        text: "Ver mi lectura",
        destination: "result_or_resource_link_placeholder",
        placeholder: {
          key: "result_or_resource_link",
          value: "result_or_resource_link_placeholder",
          status: "inert_placeholder_needs_future_exact_source",
        },
      },
    },
    {
      step: 2,
      role: "practice_or_value",
      mailerLiteAssetNameDraft: "ML Draft · descanso · E02 Practice",
      selectedSubject: "Una practica breve",
      selectedPreheader: "Sin hacerlo perfecto.",
      builderBlocks: ["preheader", "greeting", "body_copy", "single_cta"],
      cta: {
        text: "Guardar practica",
        destination: "practice_link_placeholder",
        placeholder: {
          key: "practice_link",
          value: "practice_link_placeholder",
          status: "inert_placeholder_needs_future_exact_source",
        },
      },
    },
    {
      step: 3,
      role: "story_or_editorial_depth",
      mailerLiteAssetNameDraft: "ML Draft · descanso · E03 Editorial depth",
      selectedSubject: "El descanso tambien pide criterio",
      selectedPreheader: "Una nota breve.",
      builderBlocks: ["preheader", "greeting", "body_copy", "single_cta"],
      cta: {
        text: "Leer nota",
        destination: "editorial_note_link_placeholder",
        placeholder: {
          key: "editorial_note_link",
          value: "editorial_note_link_placeholder",
          status: "inert_placeholder_needs_future_exact_source",
        },
      },
    },
    {
      step: 4,
      role: "invitation_or_feedback",
      mailerLiteAssetNameDraft: "ML Draft · descanso · E04 Feedback invitation",
      selectedSubject: "Que notaste",
      selectedPreheader: "Una pregunta pequena.",
      builderBlocks: ["preheader", "greeting", "body_copy", "single_cta"],
      cta: {
        text: "Responder con una linea",
        destination: "reply",
        placeholder: null,
      },
    },
  ],
  safety: {
    mailerLiteApiCalled: false,
    mailerLiteAssetsCreatedOrEdited: false,
    sendsPerformed: false,
  },
};

const emailStyleQaPacket = {
  status: "mini_launch_email_style_qa_ready_for_local_asset_plan_no_live_changes",
  launch,
  approvalGate: {
    readyForLocalAssetPlanNow: true,
    readyForMailerLiteAssetBuildNow: false,
    readyForSeedSendNow: false,
  },
};

describe("CRM vNext MailerLite mini-launch email asset build scope packet", () => {
  test("normalizes default args and report outputs", () => {
    const parsed = parseArgs(["--out", "/tmp/scope.json", "--markdown-out", "/tmp/scope.md"]);

    expect(parsed.localEmailAssetPlan).toContain("mailerlite_mini_launch_local_email_asset_plan_inteligencia_descansar_2026-05-28.json");
    expect(parsed.emailStyleQaPacket).toContain("mailerlite_mini_launch_email_style_qa_packet_inteligencia_descansar_2026-05-28.json");
    expect(parsed.out).toBe("/tmp/scope.json");
    expect(parsed.markdownOut).toBe("/tmp/scope.md");
  });

  test("validates the local asset plan as ready only when build and send gates stay closed", () => {
    const readiness = validateReadiness({ localEmailAssetPlan, emailStyleQaPacket });

    expect(readiness.ok).toBe(true);
    expect(readiness.issues).toEqual([]);
    expect(readiness.assets).toHaveLength(4);
  });

  test("builds an exact human approval boundary without approving execution", () => {
    const packet = buildEmailAssetBuildScopePacket({
      localEmailAssetPlan,
      emailStyleQaPacket,
      generatedAt: "2026-05-28T00:00:00.000Z",
    });

    expect(packet.status).toBe("email_asset_build_scope_packet_ready_for_exact_human_approval_no_live_changes");
    expect(packet.executiveSummary).toMatchObject({
      assetCount: 4,
      inertUrlPlaceholderCount: 3,
      replyCtaCount: 1,
      readyForExactAssetBuildApprovalRequestNow: true,
      readyForMailerLiteAssetBuildNow: false,
      readyForSeedSendNow: false,
      canCreateOrEditMailerLiteAssetsNow: false,
      openLiveMutationGateCount: 0,
    });
    expect(packet.requestedFutureScope).toMatchObject({
      canAskAlejandroForApproval: true,
      packetIsApprovalByItself: false,
      canExecuteBuildNow: false,
    });
    expect(packet.requestedFutureScope.exactApprovalPhrase).toContain("Apruebo SOLO crear/editar como borradores");
    expect(packet.requestedFutureScope.exactApprovalPhrase).toContain("sin enviar correos");
    expect(packet.assetBuildScope.assets[0].stillClosed).toContain("send_email");
    expect(packet.assetBuildScope.inertUrlPlaceholders).toHaveLength(3);
    expect(packet.assetBuildScope.replyCtas).toHaveLength(1);
    expect(packet.safety).toMatchObject({
      mailerLiteApiCalled: false,
      mailerLiteAssetsCreatedOrEdited: false,
      subscribersRead: false,
      sendsPerformed: false,
      factStoreWritePerformed: false,
    });
  });

  test("blocks if the source plan unexpectedly opens builder or send gates", () => {
    const packet = buildEmailAssetBuildScopePacket({
      localEmailAssetPlan: {
        ...localEmailAssetPlan,
        approvalBoundary: {
          ...localEmailAssetPlan.approvalBoundary,
          readyForMailerLiteAssetBuildNow: true,
        },
      },
      emailStyleQaPacket,
      generatedAt: "2026-05-28T00:00:00.000Z",
    });

    expect(packet.status).toBe("email_asset_build_scope_packet_blocked_before_exact_human_approval");
    expect(packet.requestedFutureScope.canAskAlejandroForApproval).toBe(false);
    expect(packet.blockers).toContain("local_email_asset_plan_build_gate_unexpectedly_open");
  });

  test("renders markdown that cannot be mistaken for approval or a builder run", () => {
    const packet = buildEmailAssetBuildScopePacket({
      localEmailAssetPlan,
      emailStyleQaPacket,
      generatedAt: "2026-05-28T00:00:00.000Z",
    });
    const markdown = renderMarkdown(packet);

    expect(markdown).toContain("Email Asset Build Scope Packet");
    expect(markdown).toContain("Ready for MailerLite build now: false");
    expect(markdown).toContain("Can create/edit MailerLite assets now: false");
    expect(markdown).toContain("This packet is not approval");
    expect(markdown).toContain("Sin MailerLite API calls");
  });

  test("builds the exact phrase from asset and placeholder counts", () => {
    const phrase = exactApprovalPhraseFor({
      launch,
      assets: localEmailAssetPlan.assetRows,
      placeholders: [
        { value: "result_or_resource_link_placeholder" },
        { value: "practice_link_placeholder" },
      ],
    });

    expect(phrase).toContain("los 4 assets");
    expect(phrase).toContain("result_or_resource_link_placeholder");
    expect(phrase).toContain("sin workflows");
  });
});
