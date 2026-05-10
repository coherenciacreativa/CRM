import { describe, expect, test } from "vitest";
import { buildCrmVNextLeadCaptureEvidenceHelper } from "../lib/crm/crm-vnext-lead-capture-evidence-helper.js";

const NOW = "2026-05-10T12:00:00.000Z";

describe("CRM vNext lead-capture evidence helper", () => {
  test("converts a ManyChat capture record into review-only evidence for an Instagram-origin contact", () => {
    const report = buildCrmVNextLeadCaptureEvidenceHelper({
      text: "@cadavid_eli se llama Eliana, asiste a mis clases de yoga desde hace dos meses y llegó por Instagram.",
      sourceKind: "alejandro_conversation",
      reporter: "Alejandro",
      channel: "codex",
      now: NOW,
      cards: [],
      mailerBridgeRows: [],
      leadCaptureSearchResults: {
        leadCaptureRecords: [
          {
            id: "webhook-1",
            sourceSystem: "manychat",
            flow_name: "To CRM copy 2",
            contact_id: "563924665",
            instagram_username: "cadavid_eli",
            full_name: "Eliana Cadavid",
            custom_fields: [
              { name: "email", value: "eliana@example.com" },
              { name: "whatsapp", value: "+573104954266" },
            ],
            last_text_input: "Hola Alejandro, mi correo es eliana@example.com y mi WhatsApp es 310 495 4266.",
            tags: ["Instagram onboarding", "Yoga"],
          },
          {
            id: "unrelated",
            sourceSystem: "manychat",
            instagram_username: "otra_persona",
            full_name: "Eliana Otra",
            email: "otra@example.com",
          },
        ],
      },
    });

    expect(report.mode).toBe("read_only_lead_capture_evidence_helper");
    expect(report.queryPlans[0].searchTerms).toEqual(expect.arrayContaining(["cadavid_eli", "Eliana"]));
    expect(report.queryPlans[0].suggestedSources.map((source) => source.sourceSystem)).toEqual([
      "manychat",
      "crm_webhook",
      "vercel_proxy",
      "whatsapp_automation",
      "mailerlite_form",
    ]);
    expect(report.summary).toMatchObject({
      clues: 1,
      queryPlans: 1,
      leadCaptureRecordsRead: 2,
      leadCaptureRecordsMatched: 1,
      evidenceSources: 1,
      authBlocked: false,
    });
    expect(report.evidenceSources[0]).toMatchObject({
      sourceKind: "lead_capture_export",
      sourceId: "lead-capture:manychat:webhook-1",
      email: "eliana@example.com",
      handle: "cadavid_eli",
    });
    expect(report.evidenceSources[0].snippet).toContain("Phone: +573104954266");
    expect(report.evidenceSources[0].snippet).toContain("Flow: To CRM copy 2");
    expect(report.reviewSignals).toContainEqual(
      expect.objectContaining({
        code: "handle_matched_capture_identity",
        instagramHandle: "cadavid_eli",
      }),
    );
    expect(report.safety.manyChatLiveMutationProhibited).toBe(true);
    expect(report.safety.instagramPermissionMutationProhibited).toBe(true);
  });

  test("asks for a lead-capture source hunt when a handle has no supplied match", () => {
    const report = buildCrmVNextLeadCaptureEvidenceHelper({
      text: "@cadavid_eli se llama Eliana y llegó por Instagram.",
      sourceKind: "alejandro_conversation",
      now: NOW,
      cards: [],
      mailerBridgeRows: [],
      leadCaptureSearchResults: [],
    });

    expect(report.summary.evidenceSources).toBe(0);
    expect(report.reviewSignals).toContainEqual(
      expect.objectContaining({
        code: "lead_capture_source_hunt_required",
        instagramHandle: "cadavid_eli",
      }),
    );
  });

  test("reports auth blockers without trying to refresh credentials or touch live channels", () => {
    const report = buildCrmVNextLeadCaptureEvidenceHelper({
      text: "@cadavid_eli se llama Eliana.",
      sourceKind: "alejandro_conversation",
      now: NOW,
      cards: [],
      mailerBridgeRows: [],
      authBlocker: "manychat_read_export_required",
    });

    expect(report.summary.authBlocked).toBe(true);
    expect(report.auth.externalSearchStatus).toBe("blocked");
    expect(report.auth.liveManyChatCalledByHelper).toBe(false);
    expect(report.auth.liveInstagramCalledByHelper).toBe(false);
    expect(report.auth.suggestedUnblockAction).toContain("Ask Alejandro");
    expect(report.safety.credentialReadProhibited).toBe(true);
  });

  test("does not extract dates from summary notes as phones", () => {
    const report = buildCrmVNextLeadCaptureEvidenceHelper({
      text: "@cadavid_eli se llama Eliana.",
      sourceKind: "alejandro_conversation",
      now: NOW,
      cards: [],
      mailerBridgeRows: [],
      leadCaptureSearchResults: [
        {
          id: "summary",
          sourceSystem: "crm_webhook",
          instagram_username: "cadavid_eli",
          name: "Eliana Cadavid",
          phone: "3104954266",
          notes: "10 interactions linked to this contact; range 2026-02-17 to 2026-02-27.",
        },
      ],
    });

    expect(report.evidenceSources[0].snippet).toContain("Phone: 3104954266");
    expect(report.evidenceSources[0].snippet).not.toContain("20260217");
  });
});
