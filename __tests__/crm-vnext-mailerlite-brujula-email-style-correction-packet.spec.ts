import { describe, expect, test } from "vitest";

import {
  buildEmailDraft,
  buildPacket,
  buildStyleChecks,
  parseArgs,
  renderHtml,
  renderMarkdown,
  renderPlainText,
  scanPublicText,
} from "../scripts/crm-vnext-mailerlite-brujula-email-style-correction-packet.mjs";

const emailStyleQa = {
  status: "brujula_email_style_qa_yellow_no_live_changes",
  executiveSummary: {
    functionalStatus: "green_test_delivery_verified",
    creativeStatus: "yellow_needs_email_style_alignment",
  },
  qaChecks: [
    { id: "functional_test_lane", status: "green" },
    { id: "typography_alignment", status: "yellow_blocker" },
    { id: "signature_identity", status: "yellow_blocker" },
    { id: "cta_style", status: "yellow_blocker" },
    { id: "footer_and_socials", status: "yellow_blocker" },
  ],
};

const emailStyleCanon = "Poppins, sans-serif\nGeorgia, serif\n#F4F7FA\n#FFFFFF\n#474747";
const emailEvidence = "Brújula usa Inter y conserva footer default.";
const brujulaProposal = "Email 1: entrega de La Brújula de Claridad.";
const brandAssetRegistry = "Emails / newsletter usan el canon por canal.";
const sourceDigests = [
  {
    path: "/tmp/email_style_canon.md",
    present: true,
    chars: 100,
    consultedFor: "email canon",
  },
];

describe("CRM vNext MailerLite Brújula email style correction packet", () => {
  test("normalizes default args and draft output paths", () => {
    const parsed = parseArgs([
      "--out",
      "/tmp/brujula-correction.json",
      "--markdown-out",
      "/tmp/brujula-correction.md",
    ]);

    expect(parsed.emailStyleQa).toContain("mailerlite_brujula_email_style_qa_packet_2026-05-27.json");
    expect(parsed.emailStyleCanon).toContain("email_style_canon.md");
    expect(parsed.htmlOut).toContain("mailerlite_brujula_email1_corrected_draft_2026-05-27.html");
    expect(parsed.plainTextOut).toContain("mailerlite_brujula_email1_corrected_draft_2026-05-27.txt");
    expect(parsed.out).toBe("/tmp/brujula-correction.json");
  });

  test("builds public copy without internal terms or repeated formula", () => {
    const draft = buildEmailDraft();
    const plainText = renderPlainText(draft);
    const scan = scanPublicText(plainText);

    expect(draft.subject).toBe("Aquí está La Brújula de Claridad");
    expect(draft.ctaText).toBe("Abrir la guía");
    expect(plainText).toContain("No busca decidir por ti.");
    expect(scan.ok).toBe(true);
    expect(scan.bannedTermHits).toEqual([]);
    expect(scan.sometimesFormulaCount).toBe(0);
    expect(plainText).not.toMatch(/lead magnet|MailerLite|CRM|workflow|tag/i);
  });

  test("renders local HTML with email canon applied", () => {
    const html = renderHtml(buildEmailDraft());
    const checks = buildStyleChecks({ html, emailStyleQa });
    const byId = Object.fromEntries(checks.checks.map((check) => [check.id, check]));

    expect(html).toContain("font-family: Poppins");
    expect(html).toContain("font-family: Georgia");
    expect(html).toContain("#F4F7FA");
    expect(html).toContain("#FFFFFF");
    expect(html).toContain("#474747");
    expect(html).toContain("background: #2F3E63");
    expect(byId.poppins_body.status).toBe("specified");
    expect(byId.cta_not_default_mailerlite_blue.status).toBe("specified_needs_render_check");
    expect(byId.signature_identity.status).toBe("text_fallback_specified_visual_signature_asset_still_pending");
    expect(checks.previousBlockerIds).toContain("typography_alignment");
  });

  test("builds local-only correction packet without opening test or public use", () => {
    const packet = buildPacket({
      emailStyleQa,
      emailStyleCanon,
      emailEvidence,
      brujulaProposal,
      brandAssetRegistry,
      plainTextPath: "/tmp/brujula.txt",
      htmlPath: "/tmp/brujula.html",
      sourceDigests,
      generatedAt: "2026-05-27T00:00:00.000Z",
    });

    expect(packet.ok).toBe(true);
    expect(packet.status).toBe("brujula_email1_corrected_draft_ready_for_mailerlite_builder_no_live_changes");
    expect(packet.executiveSummary).toMatchObject({
      publicUseReady: false,
      testSendReady: false,
      correctedDraftStatus: "ready_for_mailerlite_builder_or_brand_review_not_render_verified",
    });
    expect(packet.approvalBoundary.closedNow).toContain("No MailerLite test send.");
    expect(packet.safety).toMatchObject({
      localOnly: true,
      mailerLiteApiCalled: false,
      sendsPerformed: false,
      factStoreWritePerformed: false,
    });
  });

  test("renders operator-readable markdown with remaining green criteria", () => {
    const packet = buildPacket({
      emailStyleQa,
      emailStyleCanon,
      emailEvidence,
      brujulaProposal,
      brandAssetRegistry,
      plainTextPath: "/tmp/brujula.txt",
      htmlPath: "/tmp/brujula.html",
      sourceDigests,
      generatedAt: "2026-05-27T00:00:00.000Z",
    });
    const markdown = renderMarkdown(packet);

    expect(markdown).toContain("Brújula Email 1 Style Correction Packet");
    expect(markdown).toContain("Plain text draft: /tmp/brujula.txt");
    expect(markdown).toContain("HTML preview: /tmp/brujula.html");
    expect(markdown).toContain("typography_alignment");
    expect(markdown).toContain("No MailerLite email edit.");
    expect(markdown).toContain("Sin subscribers, grupos, workflows");
  });
});
