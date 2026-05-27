import { describe, expect, test } from "vitest";

import {
  buildBrandApproval,
  buildEmailStyleQaPacket,
  buildStyleChecks,
  parseArgs,
  renderMarkdown,
} from "../scripts/crm-vnext-mailerlite-mini-launch-email-style-qa-packet.mjs";

const launch = {
  launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
  resourceName: "Inteligencia para descansar",
  resourceType: "quiz",
};

const emailSequencePacket = {
  ok: true,
  status: "email_sequence_asset_packet_ready_for_brand_review_no_live_changes",
  launch,
  sequenceQa: {
    verdict: "yellow_ready_for_brand_review_not_approved",
  },
  emailSequence: [
    {
      step: 1,
      role: "delivery_and_orientation",
      publicCopy: {
        subjectOptions: [{ text: "Tu lectura de descanso" }],
        preheaderOptions: [{ text: "Una lectura breve, sin exigirte calma." }],
        emailBody: {
          greeting: "Hola,",
          paragraphs: [
            "Gracias por hacer Inteligencia para descansar.",
            "Esto no es un diagnostico ni una promesa de dormir mejor.",
          ],
          cta: { text: "Ver mi lectura y practica", destination: "result_link" },
          closing: "Un abrazo,\nAlejandro",
        },
        plainTextFallback: "Hola,\n\nGracias por hacer Inteligencia para descansar.",
      },
    },
    {
      step: 2,
      role: "practice_or_value",
      publicCopy: {
        subjectOptions: [{ text: "Una practica pequena para esta noche" }],
        preheaderOptions: [{ text: "Un gesto posible, no otra tarea." }],
        emailBody: {
          greeting: "Hola,",
          paragraphs: ["Prueba una practica breve y mira que cambia."],
          cta: { text: "Guardar esta practica", destination: "practice_link" },
          closing: "Un abrazo,\nAlejandro",
        },
        plainTextFallback: "Prueba una practica breve.",
      },
    },
  ],
  mailerLiteAssetPlan: {
    assetCount: 2,
    assets: [
      { mailerLiteAssetNameDraft: "ML Draft · descanso · E01 Delivery orientation" },
      { mailerLiteAssetNameDraft: "ML Draft · descanso · E02 Practice" },
    ],
  },
};

const brandResponse = {
  department: "brand",
  launchId: launch.launchId,
  reviewMode: "no_live_review",
  liveApprovalGranted: false,
  sequenceDecision: "approve",
  sequenceNotes: [
    "Approved for no-live continuation.",
    "Tone direction is aligned with Brand Hub.",
  ],
  emailStyleGaps: [
    "Verify typography, spacing, CTA treatment and footer/legal/social area against email_style_canon.",
    "Use visual signature or declare a deliberate text-signature fallback.",
  ],
  publicInternalLeakIssues: [],
  claimsRiskIssues: [
    "Do not promise better sleep, anxiety relief, clinical benefit, diagnosis or guaranteed transformation.",
  ],
  blockers: [],
};

const reconciliation = {
  status: "department_reviews_reconciled_ready_for_next_no_live_moves",
  actionPlan: {
    actions: [
      {
        id: "sequence_ready_for_email_style_qa_or_asset_plan",
        status: "ready_no_live",
      },
    ],
  },
};

const emailStyleCanon = `
# Email Style Canon

Un email de Marca debe sentirse como carta/editorial.
Cuerpo: Poppins, sans-serif.
Acento: Georgia, serif.
Fondo externo #F4F7FA.
Firma visual de Alejandro.
`;

const sourceDigests = [
  {
    path: "/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_sequence_asset_packet_inteligencia_descansar_2026-05-27.json",
    present: true,
    chars: 1000,
    consultedFor: "four-email draft sequence and no-live asset plan",
  },
];

describe("CRM vNext MailerLite mini-launch email style QA packet", () => {
  test("normalizes default args and report outputs", () => {
    const parsed = parseArgs(["--out", "/tmp/style.json", "--markdown-out", "/tmp/style.md"]);

    expect(parsed.emailSequencePacket).toContain("mailerlite_mini_launch_email_sequence_asset_packet_inteligencia_descansar_2026-05-27.json");
    expect(parsed.brandResponse).toContain("brand_response.json");
    expect(parsed.reconciliation).toContain("mailerlite_mini_launch_department_review_reconciliation_after_responses_inteligencia_descansar_2026-05-27.json");
    expect(parsed.out).toBe("/tmp/style.json");
    expect(parsed.markdownOut).toBe("/tmp/style.md");
  });

  test("extracts final Brand no-live approval without opening live gates", () => {
    const approval = buildBrandApproval({ brandResponse, reconciliation });

    expect(approval).toMatchObject({
      sequenceApprovedNoLive: true,
      reconciliationReadyForStyleQa: true,
      liveApprovalGranted: false,
      brandBlockerCount: 0,
      styleGapCount: 2,
      claimsRiskCount: 1,
    });
  });

  test("builds style checks from Brand gaps, canon and public draft scan", () => {
    const approval = buildBrandApproval({ brandResponse, reconciliation });
    const checks = buildStyleChecks({
      brandApproval: approval,
      emailStyleCanon,
      publicTextScan: { bannedTermHits: [], publicTextChars: 500 },
    });

    expect(checks.find((check) => check.id === "brand_sequence_approval")).toMatchObject({
      status: "green_no_live",
    });
    expect(checks.find((check) => check.id === "typography_and_container")?.status).toBe("yellow_requires_builder_mapping");
    expect(checks.find((check) => check.id === "signature_footer_socials")?.status).toBe("yellow_requires_asset_or_declared_fallback");
    expect(checks.find((check) => check.id === "cta_treatment")?.status).toBe("yellow_requires_design_choice");
  });

  test("builds a no-live QA packet ready only for local asset planning", () => {
    const packet = buildEmailStyleQaPacket({
      emailSequencePacket,
      brandResponse,
      reconciliation,
      emailStyleCanon,
      sourceDigests,
      generatedAt: "2026-05-28T00:00:00.000Z",
    });

    expect(packet.status).toBe("mini_launch_email_style_qa_ready_for_local_asset_plan_no_live_changes");
    expect(packet.executiveSummary).toMatchObject({
      brandSequenceApprovedNoLive: true,
      readyForLocalAssetPlanNow: true,
      hardBlockerCount: 0,
      publicUseReady: false,
      mailerLiteBuildReady: false,
      seedSendReady: false,
    });
    expect(packet.approvalGate).toMatchObject({
      readyForLocalAssetPlanNow: true,
      readyForMailerLiteAssetBuildNow: false,
      readyForSeedSendNow: false,
      canCreateOrEditMailerLiteAssetsNow: false,
      canAssignSubscribersNow: false,
      canAppendSignalLedgerNow: false,
    });
    expect(packet.safety).toMatchObject({
      mailerLiteApiCalled: false,
      subscribersRead: false,
      sendsPerformed: false,
      crmCardMutationsPerformed: false,
    });
  });

  test("blocks before asset planning if Brand final approval is absent", () => {
    const packet = buildEmailStyleQaPacket({
      emailSequencePacket,
      brandResponse: { ...brandResponse, sequenceDecision: "revise" },
      reconciliation,
      emailStyleCanon,
      sourceDigests,
      generatedAt: "2026-05-28T00:00:00.000Z",
    });

    expect(packet.status).toBe("mini_launch_email_style_qa_blocked_before_asset_plan");
    expect(packet.executiveSummary.hardBlockerCount).toBe(1);
    expect(packet.approvalGate.readyForMailerLiteAssetBuildNow).toBe(false);
  });

  test("renders a report that cannot be mistaken for MailerLite build approval", () => {
    const packet = buildEmailStyleQaPacket({
      emailSequencePacket,
      brandResponse,
      reconciliation,
      emailStyleCanon,
      sourceDigests,
      generatedAt: "2026-05-28T00:00:00.000Z",
    });
    const markdown = renderMarkdown(packet);

    expect(markdown).toContain("Mini-Launch Email Style QA Packet");
    expect(markdown).toContain("Ready for local asset plan now: true");
    expect(markdown).toContain("Ready for MailerLite build now: false");
    expect(markdown).toContain("Sin assets/grupos/workflows/forms creados o editados");
  });
});
