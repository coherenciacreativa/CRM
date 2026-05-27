import { describe, expect, test } from "vitest";

import {
  buildAssetRows,
  buildLocalEmailAssetPlan,
  canonicalStyleMap,
  parseArgs,
  renderMarkdown,
} from "../scripts/crm-vnext-mailerlite-mini-launch-local-email-asset-plan.mjs";

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
      publicCopy: {
        subjectOptions: [{ text: "Tu lectura de descanso" }],
        preheaderOptions: [{ text: "Una entrada amable." }],
        emailBody: {
          paragraphs: ["Gracias por hacer el quiz."],
          cta: {
            text: "Ver mi lectura",
            destination: "result_or_resource_link_placeholder",
            posture: "one clear CTA",
          },
        },
      },
    },
    {
      step: 2,
      role: "practice_or_value",
      status: "draft_for_brand_review_not_public_not_sent",
      publicCopy: {
        subjectOptions: [{ text: "Una practica breve" }],
        preheaderOptions: [{ text: "Sin hacerlo perfecto." }],
        emailBody: {
          paragraphs: ["Prueba esto con suavidad."],
          cta: {
            text: "Guardar practica",
            destination: "practice_link_placeholder",
          },
        },
      },
    },
  ],
  mailerLiteAssetPlan: {
    assetCount: 2,
    assets: [
      {
        step: 1,
        mailerLiteAssetNameDraft: "ML Draft · descanso · E01 Delivery orientation",
        sourceStatus: "draft_from_prior_brand_email_asset_packet_not_public_not_sent",
      },
      {
        step: 2,
        mailerLiteAssetNameDraft: "ML Draft · descanso · E02 Practice",
        sourceStatus: "draft_for_brand_review_not_public_not_sent",
      },
    ],
  },
};

const emailStyleQaPacket = {
  status: "mini_launch_email_style_qa_ready_for_local_asset_plan_no_live_changes",
  launch,
  executiveSummary: {
    hardBlockerCount: 0,
    yellowCheckCount: 5,
  },
  approvalGate: {
    readyForLocalAssetPlanNow: true,
    readyForMailerLiteAssetBuildNow: false,
    readyForSeedSendNow: false,
  },
};

const emailStyleCanon = `
Fondo externo #F4F7FA.
Contenedor blanco #FFFFFF.
Texto principal #474747.
Cuerpo Poppins, sans-serif.
Acento Georgia, serif.
firma visual de Alejandro.
`;

const sourceDigests = [
  {
    path: "/tmp/email-sequence.json",
    present: true,
    chars: 1000,
    consultedFor: "approved four-email sequence draft and MailerLite asset names",
  },
];

describe("CRM vNext MailerLite mini-launch local email asset plan", () => {
  test("normalizes default args and report outputs", () => {
    const parsed = parseArgs(["--out", "/tmp/asset-plan.json", "--markdown-out", "/tmp/asset-plan.md"]);

    expect(parsed.emailSequencePacket).toContain("mailerlite_mini_launch_email_sequence_asset_packet_inteligencia_descansar_2026-05-27.json");
    expect(parsed.emailStyleQaPacket).toContain("mailerlite_mini_launch_email_style_qa_packet_inteligencia_descansar_2026-05-28.json");
    expect(parsed.emailStyleCanon).toContain("email_style_canon.md");
    expect(parsed.out).toBe("/tmp/asset-plan.json");
    expect(parsed.markdownOut).toBe("/tmp/asset-plan.md");
  });

  test("maps canonical style values from Brand email canon", () => {
    const styleMap = canonicalStyleMap(emailStyleCanon);

    expect(styleMap).toMatchObject({
      outerBackground: "#F4F7FA",
      containerBackground: "#FFFFFF",
      bodyColor: "#474747",
      bodyFont: "Poppins, sans-serif",
      accentFont: "Georgia, serif",
      signaturePosture: "use Alejandro visual signature asset or declare text-signature fallback",
    });
  });

  test("builds asset rows with inert placeholders and live actions closed", () => {
    const rows = buildAssetRows({ emailSequencePacket, emailStyleCanon });

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      step: 1,
      role: "delivery_and_orientation",
      mailerLiteAssetNameDraft: "ML Draft · descanso · E01 Delivery orientation",
      selectedSubject: "Tu lectura de descanso",
      selectedPreheader: "Una entrada amable.",
      liveActionAllowedNow: false,
      cta: {
        text: "Ver mi lectura",
        destination: "result_or_resource_link_placeholder",
        placeholder: {
          key: "result_or_resource_link",
          status: "inert_placeholder_needs_future_exact_source",
        },
      },
    });
    expect(rows[0].builderBlocks).toContain("alejandro_signature_or_text_fallback");
    expect(rows[0].localTasksBeforeMailerLiteBuildScope.join(" ")).toContain("footer/legal/social");
  });

  test("builds a no-live local plan that can only request future exact build scope", () => {
    const packet = buildLocalEmailAssetPlan({
      emailSequencePacket,
      emailStyleQaPacket,
      emailStyleCanon,
      sourceDigests,
      generatedAt: "2026-05-28T00:00:00.000Z",
    });

    expect(packet.status).toBe("mini_launch_local_email_asset_plan_ready_no_live_changes");
    expect(packet.executiveSummary).toMatchObject({
      assetCount: 2,
      readyForLocalAssetPlanNow: true,
      readyForExactAssetBuildScopeRequestNow: true,
      readyForMailerLiteAssetBuildNow: false,
      readyForSeedSendNow: false,
      placeholderCount: 2,
    });
    expect(packet.approvalBoundary).toMatchObject({
      readyForMailerLiteAssetBuildNow: false,
      canCreateOrEditMailerLiteAssetsNow: false,
      canAssignSubscribersNow: false,
      canAppendSignalLedgerNow: false,
    });
    expect(packet.safety).toMatchObject({
      mailerLiteApiCalled: false,
      mailerLiteAssetsCreatedOrEdited: false,
      subscribersRead: false,
      sendsPerformed: false,
      factStoreWritePerformed: false,
    });
  });

  test("blocks if Email Style QA is not ready", () => {
    const packet = buildLocalEmailAssetPlan({
      emailSequencePacket,
      emailStyleQaPacket: {
        ...emailStyleQaPacket,
        status: "mini_launch_email_style_qa_blocked_before_asset_plan",
      },
      emailStyleCanon,
      sourceDigests,
      generatedAt: "2026-05-28T00:00:00.000Z",
    });

    expect(packet.status).toBe("mini_launch_local_email_asset_plan_blocked_before_scope_request");
    expect(packet.executiveSummary.readyForLocalAssetPlanNow).toBe(false);
    expect(packet.approvalBoundary.readyForMailerLiteAssetBuildNow).toBe(false);
  });

  test("renders markdown that cannot be mistaken for MailerLite build approval", () => {
    const packet = buildLocalEmailAssetPlan({
      emailSequencePacket,
      emailStyleQaPacket,
      emailStyleCanon,
      sourceDigests,
      generatedAt: "2026-05-28T00:00:00.000Z",
    });
    const markdown = renderMarkdown(packet);

    expect(markdown).toContain("Local Email Asset Plan");
    expect(markdown).toContain("Ready for exact asset-build scope request now: true");
    expect(markdown).toContain("Ready for MailerLite build now: false");
    expect(markdown).toContain("Sin assets/grupos/workflows/forms creados o editados");
  });
});
