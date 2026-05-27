import { describe, expect, test } from "vitest";

import {
  buildEmailBuilderPayloadManifest,
  buildPayloadRows,
  buildSafety,
  parseArgs,
  renderMarkdown,
  validateReadiness,
} from "../scripts/crm-vnext-mailerlite-mini-launch-email-builder-payload-manifest.mjs";

const launch = {
  launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
  resourceName: "Inteligencia para descansar",
  resourceType: "quiz",
};

const emailSequencePacket = {
  status: "email_sequence_asset_packet_ready_for_brand_review_no_live_changes",
  launch,
  emailSequence: [
    {
      step: 1,
      role: "delivery_and_orientation",
      status: "draft_from_prior_brand_email_asset_packet_not_public_not_sent",
      mailerLiteAssetNameDraft: "ML Draft · descanso · E01 Delivery orientation",
      publicCopy: {
        subjectOptions: [{ text: "Tu lectura de descanso" }],
        preheaderOptions: [{ text: "Una entrada amable." }],
        emailBody: {
          greeting: "Hola,",
          paragraphs: ["Gracias por hacer el quiz.", "Te dejo una pista pequeña."],
          cta: {
            text: "Ver mi lectura",
            destination: "result_or_resource_link_placeholder",
          },
          closing: "Un abrazo,\nAlejandro",
        },
        plainTextFallback: "Hola,\n\nGracias por hacer el quiz.\n\n{{ result_or_resource_link }}",
      },
    },
    {
      step: 2,
      role: "practice_or_value",
      status: "draft_for_brand_review_not_public_not_sent",
      mailerLiteAssetNameDraft: "ML Draft · descanso · E02 Practice",
      publicCopy: {
        subjectOptions: [{ text: "Una practica breve" }],
        preheaderOptions: [{ text: "Sin hacerlo perfecto." }],
        emailBody: {
          greeting: "Hola,",
          paragraphs: ["Una practica pequeña.", "Hazla sin exigirte calma."],
          cta: {
            text: "Guardar practica",
            destination: "practice_link_placeholder",
          },
          closing: "Un abrazo,\nAlejandro",
        },
        plainTextFallback: "Guardar practica: {{ practice_link }}",
      },
    },
    {
      step: 3,
      role: "story_or_editorial_depth",
      status: "draft_for_brand_review_not_public_not_sent",
      mailerLiteAssetNameDraft: "ML Draft · descanso · E03 Editorial depth",
      publicCopy: {
        subjectOptions: [{ text: "El descanso tambien pide criterio" }],
        preheaderOptions: [{ text: "Una nota breve." }],
        emailBody: {
          greeting: "Hola,",
          paragraphs: ["El descanso tambien pide criterio.", "Una nota para mirar con honestidad."],
          cta: {
            text: "Leer nota",
            destination: "editorial_note_link_placeholder",
          },
          closing: "Un abrazo,\nAlejandro",
        },
        plainTextFallback: "Leer nota: {{ editorial_note_link }}",
      },
    },
    {
      step: 4,
      role: "invitation_or_feedback",
      status: "draft_for_brand_review_not_public_not_sent",
      mailerLiteAssetNameDraft: "ML Draft · descanso · E04 Feedback invitation",
      publicCopy: {
        subjectOptions: [{ text: "Que notaste" }],
        preheaderOptions: [{ text: "Una pregunta pequena." }],
        emailBody: {
          greeting: "Hola,",
          paragraphs: ["Me interesa saber que notaste.", "Puedes responder con una linea."],
          cta: {
            text: "Responder con una linea",
            destination: "reply",
          },
          closing: "Un abrazo,\nAlejandro",
        },
        plainTextFallback: "Responde a este correo con una linea.",
      },
    },
  ],
};

const localEmailAssetPlan = {
  status: "mini_launch_local_email_asset_plan_ready_no_live_changes",
  launch,
  approvalBoundary: {
    readyForMailerLiteAssetBuildNow: false,
    readyForSeedSendNow: false,
  },
  assetRows: emailSequencePacket.emailSequence.map((email) => ({
    step: email.step,
    role: email.role,
    mailerLiteAssetNameDraft: email.mailerLiteAssetNameDraft,
    selectedSubject: email.publicCopy.subjectOptions[0].text,
    selectedPreheader: email.publicCopy.preheaderOptions[0].text,
    cta: {
      text: email.publicCopy.emailBody.cta.text,
      destination: email.publicCopy.emailBody.cta.destination,
      placeholder: email.publicCopy.emailBody.cta.destination === "reply"
        ? null
        : {
          key: email.publicCopy.emailBody.cta.destination.replace(/_placeholder$/, ""),
          value: email.publicCopy.emailBody.cta.destination,
          status: "inert_placeholder_needs_future_exact_source",
        },
    },
    styleImplementation: {
      bodyFont: "Poppins, sans-serif",
    },
  })),
  safety: {
    mailerLiteApiCalled: false,
    mailerLiteAssetsCreatedOrEdited: false,
  },
};

const emailAssetBuildScopePacket = {
  status: "email_asset_build_scope_packet_ready_for_exact_human_approval_no_live_changes",
  launch,
  executiveSummary: {
    readyForSeedSendNow: false,
  },
  requestedFutureScope: {
    canAskAlejandroForApproval: true,
    packetIsApprovalByItself: false,
    canExecuteBuildNow: false,
    exactApprovalPhrase: "Apruebo SOLO crear/editar como borradores...",
  },
  assetBuildScope: {
    assets: localEmailAssetPlan.assetRows,
  },
  safety: {
    mailerLiteApiCalled: false,
    mailerLiteAssetsCreatedOrEdited: false,
    sendsPerformed: false,
  },
};

const emailStyleCanon = `
# Email style canon
Background #F4F7FA
Container #FFFFFF
Body #474747
Poppins
Georgia
firma visual de Alejandro
`;

describe("CRM vNext MailerLite mini-launch email builder payload manifest", () => {
  test("normalizes default args and outputs", () => {
    const parsed = parseArgs(["--out", "/tmp/manifest.json", "--markdown-out", "/tmp/manifest.md"]);

    expect(parsed.emailSequencePacket).toContain("mailerlite_mini_launch_email_sequence_asset_packet_inteligencia_descansar_2026-05-27.json");
    expect(parsed.localEmailAssetPlan).toContain("mailerlite_mini_launch_local_email_asset_plan_inteligencia_descansar_2026-05-28.json");
    expect(parsed.emailAssetBuildScopePacket).toContain("mailerlite_mini_launch_email_asset_build_scope_packet_inteligencia_descansar_2026-05-28.json");
    expect(parsed.emailStyleCanon).toContain("email_style_canon.md");
    expect(parsed.out).toBe("/tmp/manifest.json");
    expect(parsed.markdownOut).toBe("/tmp/manifest.md");
  });

  test("validates readiness only when source gates remain closed", () => {
    const readiness = validateReadiness({
      emailSequencePacket,
      localEmailAssetPlan,
      emailAssetBuildScopePacket,
    });

    expect(readiness.ok).toBe(true);
    expect(readiness.issues).toEqual([]);

    const blocked = validateReadiness({
      emailSequencePacket,
      localEmailAssetPlan,
      emailAssetBuildScopePacket: {
        ...emailAssetBuildScopePacket,
        requestedFutureScope: {
          ...emailAssetBuildScopePacket.requestedFutureScope,
          canExecuteBuildNow: true,
        },
      },
    });
    expect(blocked.ok).toBe(false);
    expect(blocked.issues).toContain("email_asset_build_scope_can_execute_now_unexpectedly_open");
  });

  test("builds exact local payload rows with body blocks and placeholders", () => {
    const payloads = buildPayloadRows({
      emailSequencePacket,
      localEmailAssetPlan,
      emailAssetBuildScopePacket,
      emailStyleCanon,
    });

    expect(payloads).toHaveLength(4);
    expect(payloads[0]).toMatchObject({
      subject: "Tu lectura de descanso",
      preheader: "Una entrada amable.",
      cta: {
        destinationType: "inert_url_placeholder",
        placeholder: {
          value: "result_or_resource_link_placeholder",
        },
      },
      liveActionAllowedNow: false,
    });
    expect(payloads[0].contentBlocks.map((block) => block.type)).toContain("paragraph");
    expect(payloads[0].contentBlocks.map((block) => block.type)).toContain("compliance_footer");
    expect(payloads[3].cta.destinationType).toBe("reply_to_email");
    expect(payloads[3].cta.placeholder).toBe(null);
    expect(payloads[0].hardExclusions).toContain("send_email");
  });

  test("builds a manifest that cannot execute builder work or seed sends", () => {
    const manifest = buildEmailBuilderPayloadManifest({
      emailSequencePacket,
      localEmailAssetPlan,
      emailAssetBuildScopePacket,
      emailStyleCanon,
      generatedAt: "2026-05-28T00:00:00.000Z",
    });

    expect(manifest.status).toBe("email_builder_payload_manifest_ready_no_live_changes");
    expect(manifest.executiveSummary).toMatchObject({
      payloadCount: 4,
      inertUrlPlaceholderCount: 3,
      replyCtaCount: 1,
      canExecuteBuilderNow: false,
      canCreateOrEditMailerLiteAssetsNow: false,
      readyForSeedSendNow: false,
      openLiveMutationGateCount: 0,
    });
    expect(manifest.approvalBoundary).toMatchObject({
      manifestIsApprovalByItself: false,
      exactAssetBuildApprovalStillRequired: true,
      canExecuteBuilderNow: false,
      canSendNow: false,
      canAttachWorkflowNow: false,
      canReadOrAssignSubscribersNow: false,
    });
    expect(manifest.inertUrlPlaceholders).toHaveLength(3);
    expect(manifest.replyCtas).toHaveLength(1);
    expect(manifest.safety).toMatchObject({
      mailerLiteApiCalled: false,
      mailerLiteAssetsCreatedOrEdited: false,
      subscribersRead: false,
      sendsPerformed: false,
      factStoreWritePerformed: false,
    });
  });

  test("renders operator-safe markdown and safety stays closed", () => {
    const manifest = buildEmailBuilderPayloadManifest({
      emailSequencePacket,
      localEmailAssetPlan,
      emailAssetBuildScopePacket,
      emailStyleCanon,
      generatedAt: "2026-05-28T00:00:00.000Z",
    });
    const markdown = renderMarkdown(manifest);

    expect(buildSafety()).toMatchObject({
      localOnly: true,
      mailerLiteApiCalled: false,
      shopifyApiCalled: false,
      crmLiveApiCalled: false,
      sendsPerformed: false,
    });
    expect(markdown).toContain("Email Builder Payload Manifest");
    expect(markdown).toContain("Can execute builder now: false");
    expect(markdown).toContain("This manifest is not approval");
    expect(markdown).toContain("Sin MailerLite API calls");
  });
});
