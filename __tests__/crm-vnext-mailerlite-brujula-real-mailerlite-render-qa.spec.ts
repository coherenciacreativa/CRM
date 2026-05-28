import { describe, expect, test } from "vitest";

import {
  buildBrujulaRealMailerLiteRenderQa,
  campaignIdFromReceipt,
  parseArgs,
  payloadFromCorrection,
  receiptClosed,
} from "../scripts/crm-vnext-mailerlite-brujula-real-mailerlite-render-qa.mjs";

const correction = {
  status: "brujula_email1_corrected_draft_ready_for_mailerlite_builder_no_live_changes",
  draft: {
    emailStep: 1,
    role: "guide_delivery",
    subject: "Aquí está La Brújula de Claridad",
    preheader: "Una práctica breve para mirar una decisión con más calma.",
    ctaText: "Abrir la guía",
    guideUrl: "https://coherenciacreativa.com/pages/guia-brujula-de-claridad",
    bodyParagraphs: [
      "Gracias por pedir La Brújula de Claridad.",
      "Te la dejo aquí:",
      "Es una práctica breve para cuando una decisión empieza a hacer demasiado ruido.",
      "Si puedes, resérvate veinte minutos, algo para escribir y un poco de silencio.",
      "Si hoy no es el día, guárdala.",
    ],
    closing: "Un abrazo,",
    signatureText: "Alejandro",
  },
};

const receipt = {
  status: "brujula_email1_manual_ui_build_receipt_green_draft_created_no_sends",
  campaign: {
    id: "188677585118430654",
    name: "Brújula · Email 1 corregido · Aquí está La Brújula de Claridad",
    sent: false,
    scheduled: false,
  },
  safety: {
    sendsPerformed: false,
    schedulesPerformed: false,
  },
};

const safeCampaign = (content: string) => ({
  id: receipt.campaign.id,
  name: receipt.campaign.name,
  status: "draft",
  type: "regular",
  scheduled_for: null,
  queued_at: null,
  started_at: null,
  finished_at: null,
  is_currently_sending_out: false,
  used_in_automations: false,
  filter: null,
  has_basic_filter: false,
  missing_data: ["recipients"],
  warnings: [],
  can_be_scheduled: false,
  emails: [
    {
      subject: correction.draft.subject,
      preheader: correction.draft.preheader,
      content,
    },
  ],
});

const exactHtml = [
  "<p>Hola,</p>",
  "<p>Gracias por pedir La Brújula de Claridad.</p>",
  "<p>Te la dejo aquí:</p>",
  '<a href="https://coherenciacreativa.com/pages/guia-brujula-de-claridad">Abrir la guía</a>',
  "<p>Es una práctica breve para cuando una decisión empieza a hacer demasiado ruido.</p>",
  "<p>Si puedes, resérvate veinte minutos, algo para escribir y un poco de silencio.</p>",
  "<p>Si hoy no es el día, guárdala.</p>",
  "<p>Un abrazo,</p>",
  "<p>Alejandro</p>",
].join("");

describe("CRM vNext MailerLite Brújula real MailerLite render QA", () => {
  test("parses defaults and validates MailerLite API base", () => {
    const parsed = parseArgs(["--timeout-ms", "45000", "--out", "/tmp/brujula-real.json"]);

    expect(parsed.correction).toContain("mailerlite_brujula_email_style_correction_packet_2026-05-27.json");
    expect(parsed.manualUiReceipt).toContain("mailerlite_brujula_email1_manual_ui_build_receipt_2026-05-28.json");
    expect(parsed.timeoutMs).toBe(45000);
    expect(parsed.out).toBe("/tmp/brujula-real.json");
    expect(() => parseArgs(["--api-base", "https://example.com"])).toThrow("unsafe_api_base_not_mailerlite");
  });

  test("builds expected fragments from the correction packet and receipt", () => {
    const payload = payloadFromCorrection({ correction, receipt });

    expect(campaignIdFromReceipt(receipt)).toBe("188677585118430654");
    expect(receiptClosed(receipt)).toBe(true);
    expect(payload.mailerLiteAssetNameDraft).toBe(receipt.campaign.name);
    expect(payload.contentBlocks.map((block) => block.id)).toEqual([
      "brujula_email1_greeting",
      "brujula_email1_paragraph_1",
      "brujula_email1_paragraph_2",
      "brujula_email1_paragraph_3",
      "brujula_email1_paragraph_4",
      "brujula_email1_paragraph_5",
      "brujula_email1_cta",
      "brujula_email1_closing",
      "brujula_email1_signature",
    ]);
  });

  test("marks the real Brújula draft green only with exact content and closed safety gates", () => {
    const packet = buildBrujulaRealMailerLiteRenderQa({
      correction,
      manualUiReceipt: receipt,
      campaign: safeCampaign(exactHtml),
      generatedAt: "2026-05-28T00:00:00.000Z",
    });

    expect(packet.status).toBe("brujula_email1_real_mailerlite_render_qa_green_no_live_changes");
    expect(packet.ok).toBe(true);
    expect(packet.executiveSummary).toMatchObject({
      realMailerLiteRenderReady: true,
      allRequiredContentExact: true,
      allSafetyGatesClosed: true,
      testSendReady: false,
      publicUseReady: false,
    });
    expect(packet.testSendBoundary).toMatchObject({
      stillRequiresExactRecipient: true,
      stillRequiresExactTestSendApproval: true,
    });
    expect(packet.safety).toMatchObject({
      mailerLiteApiCalled: true,
      mailerLiteMutationsPerformed: false,
      sendsPerformed: false,
      subscriberMutationsPerformed: false,
    });
  });

  test("blocks exact-copy degradation even when normalized text is present", () => {
    const degradedHtml = exactHtml
      .replace("Aquí está La Brújula de Claridad", "Aqui esta La Brujula de Claridad")
      .replace("Abrir la guía", "Abrir la guia")
      .replace("resérvate", "reservate");
    const packet = buildBrujulaRealMailerLiteRenderQa({
      correction,
      manualUiReceipt: receipt,
      campaign: safeCampaign(degradedHtml),
      generatedAt: "2026-05-28T00:00:00.000Z",
    });

    expect(packet.status).toBe("brujula_email1_real_mailerlite_render_qa_blocked_content_mismatch_no_live_changes");
    expect(packet.ok).toBe(false);
    expect(packet.blockers).toContain("content_mismatch");
    expect(packet.draft?.content.missingRequiredFragments.map((item) => item.id)).toEqual(expect.arrayContaining([
      "brujula_email1_cta",
      "brujula_email1_paragraph_4",
    ]));
  });

  test("blocks safety drift even when content is exact", () => {
    const packet = buildBrujulaRealMailerLiteRenderQa({
      correction,
      manualUiReceipt: receipt,
      campaign: {
        ...safeCampaign(exactHtml),
        scheduled_for: "2026-06-01 09:00:00",
        missing_data: [],
        can_be_scheduled: true,
      },
      generatedAt: "2026-05-28T00:00:00.000Z",
    });

    expect(packet.status).toBe("brujula_email1_real_mailerlite_render_qa_blocked_safety_gate_mismatch_no_live_changes");
    expect(packet.ok).toBe(false);
    expect(packet.blockers).toEqual(expect.arrayContaining([
      "not_scheduled",
      "recipients_missing",
      "cannot_schedule_without_recipients",
    ]));
  });
});
